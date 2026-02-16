import { normalizeMonitorServiceName } from "./services";
import type { ActiveServiceUsageCard, MonitorProfile } from "./types";

type MeResponse = {
  user: MonitorProfile;
};

type ActiveSubscriptionResponse = {
  subscriptions: Array<{
    id: string;
    serviceName: string;
    nextBillingDate: string;
    lastUsedAt: string | null;
    focusedMinutesToday: number;
  }>;
};

export class MonitorAuthClient {
  async verifyToken(input: { baseUrl: string; token: string }) {
    const endpoint = new URL("/api/monitor/me", input.baseUrl).toString();
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Token verification failed.");
    }
    const data = (await response.json()) as MeResponse;
    return data.user;
  }

  async fetchActiveSubscriptions(input: { baseUrl: string; token: string }) {
    const endpoint = new URL("/api/monitor/subscriptions", input.baseUrl).toString();
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        authorization: `Bearer ${input.token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to fetch active subscriptions.");
    }

    const data = (await response.json()) as ActiveSubscriptionResponse;
    return data.subscriptions
      .map((subscription) => {
        const serviceName = normalizeMonitorServiceName(subscription.serviceName);
        if (!serviceName) return null;

        const result: Omit<ActiveServiceUsageCard, "unsyncedMinutes"> = {
          id: subscription.id,
          serviceName,
          nextBillingDate: subscription.nextBillingDate,
          lastUsedAt: subscription.lastUsedAt,
          focusedMinutesToday: subscription.focusedMinutesToday,
        };
        return result;
      })
      .filter((item): item is Omit<ActiveServiceUsageCard, "unsyncedMinutes"> => item !== null);
  }
}
