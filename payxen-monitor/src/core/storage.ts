import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app, safeStorage } from "electron";
import type { MonitorSettings, UsageRecord } from "./types";

const DEFAULT_SETTINGS: MonitorSettings = {
  trackingEnabled: false,
  isPaused: false,
  autoStart: true,
  consentAccepted: false,
  token: null,
  backendBaseUrl: "http://localhost:3000",
  profile: null,
};

type PersistedQueueEnvelope = {
  mode: "safe-storage" | "aes-fallback";
  payload: string;
  iv?: string;
};

export class MonitorStorage {
  private readonly settingsPath: string;
  private readonly queuePath: string;

  constructor() {
    const basePath = app.getPath("userData");
    this.settingsPath = path.join(basePath, "settings.json");
    this.queuePath = path.join(basePath, "usage-queue.enc");
  }

  readSettings(): MonitorSettings {
    try {
      const raw = fs.readFileSync(this.settingsPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<MonitorSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  writeSettings(settings: MonitorSettings) {
    fs.mkdirSync(path.dirname(this.settingsPath), { recursive: true });
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), "utf8");
  }

  readQueue(): UsageRecord[] {
    try {
      const raw = fs.readFileSync(this.queuePath, "utf8");
      const envelope = JSON.parse(raw) as PersistedQueueEnvelope;
      const decrypted =
        envelope.mode === "safe-storage"
          ? safeStorage.decryptString(Buffer.from(envelope.payload, "base64"))
          : this.decryptFallback(envelope.payload, envelope.iv ?? "");
      const parsed = JSON.parse(decrypted) as UsageRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  writeQueue(records: UsageRecord[]) {
    fs.mkdirSync(path.dirname(this.queuePath), { recursive: true });
    const plainText = JSON.stringify(records);
    const envelope: PersistedQueueEnvelope = safeStorage.isEncryptionAvailable()
      ? {
          mode: "safe-storage",
          payload: safeStorage.encryptString(plainText).toString("base64"),
        }
      : (() => {
          const iv = crypto.randomBytes(16);
          return {
            mode: "aes-fallback",
            payload: this.encryptFallback(plainText, iv),
            iv: iv.toString("base64"),
          };
        })();

    fs.writeFileSync(this.queuePath, JSON.stringify(envelope), "utf8");
  }

  appendQueue(records: UsageRecord[]) {
    if (records.length === 0) return;
    this.writeQueue(this.readQueue().concat(records));
  }

  shiftQueue(count: number) {
    if (count <= 0) return;
    this.writeQueue(this.readQueue().slice(count));
  }

  clearQueue() {
    this.writeQueue([]);
  }

  clearQueueForService(serviceName: UsageRecord["serviceName"]) {
    const filtered = this.readQueue().filter((record) => record.serviceName !== serviceName);
    this.writeQueue(filtered);
  }

  getUnsyncedMinutesByService(serviceName: UsageRecord["serviceName"]) {
    return this.readQueue().filter((record) => record.serviceName === serviceName).length;
  }

  private getFallbackKey() {
    return crypto.scryptSync(
      `${os.hostname()}|${os.userInfo().username}|payxen-monitor`,
      "payxen-monitor-local-encryption",
      32,
    );
  }

  private encryptFallback(plainText: string, iv: Buffer) {
    const cipher = crypto.createCipheriv("aes-256-cbc", this.getFallbackKey(), iv);
    return Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]).toString("base64");
  }

  private decryptFallback(payloadBase64: string, ivBase64: string) {
    if (!ivBase64) return "[]";
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      this.getFallbackKey(),
      Buffer.from(ivBase64, "base64"),
    );
    return Buffer.concat([
      decipher.update(Buffer.from(payloadBase64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
