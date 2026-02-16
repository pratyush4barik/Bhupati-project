import type { UsageRecord } from "./types";

type UsageSyncResponse = {
  accepted: number;
  skipped: number;
};

export class MonitorApiClient {
  async syncUsage(args: {
    baseUrl: string;
    token: string;
    records: UsageRecord[];
  }): Promise<UsageSyncResponse> {
    const endpoint = new URL("/api/monitor/usage", args.baseUrl).toString();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${args.token}`,
      },
      body: JSON.stringify({ records: args.records }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Sync failed with status ${response.status}`);
    }

    const parsed = (await response.json()) as Partial<UsageSyncResponse>;
    return {
      accepted: Number(parsed.accepted ?? 0),
      skipped: Number(parsed.skipped ?? 0),
    };
  }
}
