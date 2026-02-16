import { MonitorApiClient } from "./monitor-api";
import { MonitorStorage } from "./storage";
import type { UsageRecord } from "./types";

const SYNC_BATCH_SIZE = 300;

export class SyncEngine {
  private readonly apiClient = new MonitorApiClient();
  private syncLock = false;

  state: "idle" | "syncing" | "offline" | "error" = "idle";
  lastSyncAt: string | null = null;
  lastError: string | null = null;

  constructor(private readonly storage: MonitorStorage) {}

  async syncIfNeeded(input: { token: string | null; backendBaseUrl: string }) {
    if (!input.token || this.syncLock) return;
    const queued = this.storage.readQueue();
    if (queued.length === 0) {
      this.state = "idle";
      this.lastError = null;
      return;
    }

    this.syncLock = true;
    this.state = "syncing";
    this.lastError = null;

    try {
      const batch: UsageRecord[] = queued.slice(0, SYNC_BATCH_SIZE);
      await this.apiClient.syncUsage({
        baseUrl: input.backendBaseUrl,
        token: input.token,
        records: batch,
      });
      this.storage.shiftQueue(batch.length);
      this.lastSyncAt = new Date().toISOString();
      this.state = "idle";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      this.lastError = message;
      this.state = this.looksOffline(message) ? "offline" : "error";
    } finally {
      this.syncLock = false;
    }
  }

  private looksOffline(message: string) {
    const lower = message.toLowerCase();
    return (
      lower.includes("network") ||
      lower.includes("fetch failed") ||
      lower.includes("timed out") ||
      lower.includes("offline")
    );
  }
}
