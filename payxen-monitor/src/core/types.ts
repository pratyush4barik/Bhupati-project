import type { MonitorServiceName } from "./services";

export type UsageRecord = {
  serviceName: MonitorServiceName;
  focusedMinutes: number;
  date: string;
  eventId: string;
};

export type MonitorSettings = {
  trackingEnabled: boolean;
  isPaused: boolean;
  autoStart: boolean;
  consentAccepted: boolean;
  token: string | null;
  backendBaseUrl: string;
  profile: MonitorProfile | null;
};

export type MonitorProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type ActiveServiceUsageCard = {
  id: string;
  serviceName: MonitorServiceName;
  nextBillingDate: string;
  lastUsedAt: string | null;
  focusedMinutesToday: number;
  unsyncedMinutes: number;
};

export type RuntimeStatus = {
  connected: boolean;
  backendBaseUrl: string;
  trackingEnabled: boolean;
  isPaused: boolean;
  autoStart: boolean;
  consentAccepted: boolean;
  currentService: MonitorServiceName | null;
  lastSyncAt: string | null;
  syncState: "idle" | "syncing" | "offline" | "error";
  queueSize: number;
  trackingServiceStatus: "active" | "inactive";
  trackingFailureReason: string | null;
  profile: MonitorProfile | null;
  activeServiceCards: ActiveServiceUsageCard[];
  todaySummary: Array<{
    serviceName: MonitorServiceName;
    minutes: number;
  }>;
  syncError: string | null;
};
