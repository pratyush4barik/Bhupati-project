"use client";

import { useEffect, useState, useCallback } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { UsageOverview, type GhostSubscription } from "./usage-overview";
import { AgentActivityEditor } from "./agent-activity-editor";
import { FreeTrialManager } from "./free-trial-manager";

export function GhostAgentDashboard() {
  const [subs, setSubs] = useState<GhostSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ghost-agent");
        if (!res.ok) throw new Error("Failed to load data");
        const data = await res.json();
        setSubs(data.subscriptions ?? []);
      } catch {
        setError("Could not load Ghost Agent data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Shared updater — child components call this after any toggle/change
  const updateSub = useCallback(
    (subId: string, patch: Partial<GhostSubscription>) => {
      setSubs((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950/30 p-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Usage Data */}
      <UsageOverview subscriptions={subs} />

      {/* Section 2: Agent Activity Editor */}
      <AgentActivityEditor subscriptions={subs} onUpdate={updateSub} />

      {/* Section 3: Free Trial Cancellation */}
      <FreeTrialManager subscriptions={subs} onUpdate={updateSub} />
    </div>
  );
}
