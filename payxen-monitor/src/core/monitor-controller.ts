import { EventEmitter } from "node:events";
import { MonitorAuthClient } from "./auth";
import { MonitorStorage } from "./storage";
import { SyncEngine } from "./sync";
import { FocusTracker } from "./tracker";
import type { ActiveServiceUsageCard, MonitorSettings, RuntimeStatus } from "./types";

const TRACK_TICK_SECONDS = 5;
const SYNC_INTERVAL_SECONDS = 60;

export class MonitorController extends EventEmitter {
  private readonly storage = new MonitorStorage();
  private readonly authClient = new MonitorAuthClient();
  private readonly tracker = new FocusTracker();
  private readonly sync = new SyncEngine(this.storage);

  private settings: MonitorSettings;
  private trackTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private currentService: RuntimeStatus["currentService"] = null;
  private trackingFailureReason: string | null = null;
  private activeServiceCards: ActiveServiceUsageCard[] = [];

  constructor() {
    super();
    this.settings = this.storage.readSettings();
  }

  start() {
    this.stop();
    this.trackTimer = setInterval(() => void this.trackTick(), TRACK_TICK_SECONDS * 1000);
    this.syncTimer = setInterval(() => void this.syncTick(), SYNC_INTERVAL_SECONDS * 1000);
    void this.refreshActiveServices();
    void this.trackTick();
    void this.syncTick();
  }

  stop() {
    if (this.trackTimer) clearInterval(this.trackTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.trackTimer = null;
    this.syncTimer = null;
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(next: Partial<MonitorSettings>) {
    this.settings = { ...this.settings, ...next };
    this.storage.writeSettings(this.settings);
    this.emitStatus();
  }

  async connectWithToken(input: { token: string; backendBaseUrl: string }) {
    const token = input.token.trim();
    const backendBaseUrl = input.backendBaseUrl.trim();
    if (!token) throw new Error("Token is required.");
    if (!backendBaseUrl) throw new Error("Backend URL is required.");

    const profile = await this.authClient.verifyToken({
      baseUrl: backendBaseUrl,
      token,
    });

    this.updateSettings({
      token,
      backendBaseUrl,
      profile,
    });
    await this.refreshActiveServices();
    return this.getRuntimeStatus();
  }

  disconnectAccount() {
    this.updateSettings({
      token: null,
      profile: null,
      trackingEnabled: false,
      isPaused: false,
    });
    this.activeServiceCards = [];
    this.emitStatus();
  }

  deleteLocalData(serviceName?: ActiveServiceUsageCard["serviceName"]) {
    if (serviceName) {
      this.storage.clearQueueForService(serviceName);
    } else {
      this.storage.clearQueue();
    }
    this.emitStatus();
  }

  async refreshActiveServices() {
    const token = this.settings.token;
    if (!token) {
      this.activeServiceCards = [];
      this.emitStatus();
      return;
    }

    try {
      const baseCards = await this.authClient.fetchActiveSubscriptions({
        baseUrl: this.settings.backendBaseUrl,
        token,
      });

      this.activeServiceCards = baseCards.map((card) => ({
        ...card,
        unsyncedMinutes: this.storage.getUnsyncedMinutesByService(card.serviceName),
      }));
    } catch (error) {
      this.trackingFailureReason = error instanceof Error ? error.message : "Failed to load active services.";
    } finally {
      this.emitStatus();
    }
  }

  getRuntimeStatus(): RuntimeStatus {
    const syncError = this.sync.lastError;
    const trackingServiceStatus: RuntimeStatus["trackingServiceStatus"] =
      this.trackingFailureReason === null ? "active" : "inactive";

    return {
      connected: Boolean(this.settings.token),
      backendBaseUrl: this.settings.backendBaseUrl,
      trackingEnabled: this.settings.trackingEnabled,
      isPaused: this.settings.isPaused,
      autoStart: this.settings.autoStart,
      consentAccepted: this.settings.consentAccepted,
      currentService: this.currentService,
      lastSyncAt: this.sync.lastSyncAt,
      syncState: this.sync.state,
      queueSize: this.storage.readQueue().length,
      trackingServiceStatus,
      trackingFailureReason: this.trackingFailureReason,
      profile: this.settings.profile,
      activeServiceCards: this.activeServiceCards,
      todaySummary: this.tracker.getTodaySummary(),
      syncError,
    };
  }

  private emitStatus() {
    this.emit("status", this.getRuntimeStatus());
  }

  private canTrack() {
    return this.settings.trackingEnabled && this.settings.consentAccepted && !this.settings.isPaused;
  }

  private async trackTick() {
    if (!this.canTrack()) {
      this.currentService = null;
      this.emitStatus();
      return;
    }

    const result = await this.tracker.tick(TRACK_TICK_SECONDS);
    this.currentService = result.currentService;

    if (result.error) {
      this.trackingFailureReason = result.error;
    } else {
      this.trackingFailureReason = null;
    }

    if (result.records.length > 0) {
      this.storage.appendQueue(result.records);
    }
    this.emitStatus();
  }

  private async syncTick() {
    await this.sync.syncIfNeeded({
      token: this.settings.token,
      backendBaseUrl: this.settings.backendBaseUrl,
    });

    if (this.settings.token) {
      await this.refreshActiveServices();
    } else {
      this.emitStatus();
    }
  }
}
