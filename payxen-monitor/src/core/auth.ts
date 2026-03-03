import { normalizeMonitorServiceName } from "./services";
import type { ActiveServiceUsageCard, MonitorProfile } from "./types";

type MeResponse = {
  user: MonitorProfile;
};

type ProvisionResponse = {
  token: string;
  expiresAt: string;
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
  /**
   * Login with email + password. The backend provisions a monitor JWT
   * and returns the user profile in one round-trip.
   */
  async loginWithEmail(input: { baseUrl: string; email: string; password: string }) {
    const endpoint = new URL("/api/monitor/provision", input.baseUrl).toString();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Login failed.");
    }

    return (await response.json()) as ProvisionResponse;
  }

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
