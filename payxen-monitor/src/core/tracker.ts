import crypto from "node:crypto";
import { detectFocusedService } from "./window-detector";
import type { MonitorServiceName } from "./services";
import type { UsageRecord } from "./types";

type TrackerTickResult = {
  records: UsageRecord[];
  currentService: MonitorServiceName | null;
  error: string | null;
};

export class FocusTracker {
  private readonly secondAccumulator = new Map<MonitorServiceName, number>();
  private readonly todaySummary = new Map<MonitorServiceName, number>();
  private dayKey = new Date().toISOString().slice(0, 10);

  async tick(secondsPerTick: number): Promise<TrackerTickResult> {
    this.rolloverIfNeeded();
    try {
      const service = await detectFocusedService();
      if (!service) {
        return { records: [], currentService: null, error: null };
      }

      const accumulatedSeconds = (this.secondAccumulator.get(service) ?? 0) + secondsPerTick;
      this.secondAccumulator.set(service, accumulatedSeconds);

      const wholeMinutes = Math.floor(accumulatedSeconds / 60);
      if (wholeMinutes <= 0) {
        return { records: [], currentService: service, error: null };
      }

      this.secondAccumulator.set(service, accumulatedSeconds - wholeMinutes * 60);
      this.todaySummary.set(service, (this.todaySummary.get(service) ?? 0) + wholeMinutes);

      const date = new Date().toISOString().slice(0, 10);
      const records: UsageRecord[] = Array.from({ length: wholeMinutes }, () => ({
        serviceName: service,
        focusedMinutes: 1,
        date,
        eventId: crypto.randomUUID(),
      }));

      return { records, currentService: service, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Focused window access failed";
      return { records: [], currentService: null, error: message };
    }
  }

  getTodaySummary() {
    return Array.from(this.todaySummary.entries())
      .map(([serviceName, minutes]) => ({ serviceName, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }

  resetTodaySummary() {
    this.todaySummary.clear();
    this.secondAccumulator.clear();
  }

  private rolloverIfNeeded() {
    const today = new Date().toISOString().slice(0, 10);
    if (today === this.dayKey) return;
    this.dayKey = today;
    this.resetTodaySummary();
  }
}
