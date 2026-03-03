"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type TokenStatusResponse = {
  connected: boolean;
  createdAt: string | null;
  expiresAt: string | null;
};

export function MonitorControls() {
  const [status, setStatus] = useState<TokenStatusResponse | null>(null);
  const [token, setToken] = useState<string>("");
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState<"" | "connect" | "disconnect" | "delete-data">("");
  const [message, setMessage] = useState<string>("");

  const canConnect = consented && loading === "";

  async function loadStatus() {
    const response = await fetch("/api/monitor/token", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as TokenStatusResponse;
    setStatus(data);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const statusLabel = useMemo(() => {
    if (!status) return "Loading monitor status...";
    if (status.connected) return "Connected";
    return "Disconnected";
  }, [status]);

  async function connectDesktopApp() {
    if (!canConnect) return;
    setLoading("connect");
    setMessage("");
    setToken("");
    try {
      const response = await fetch("/api/monitor/token", { method: "POST" });
      const data = (await response.json()) as { token?: string; error?: string };
      if (!response.ok || !data.token) {
        setMessage(data.error ?? "Failed to generate monitor token.");
        return;
      }
      setToken(data.token);
      setMessage("Token generated. Paste this token in PayXen Monitor desktop app.");
      await loadStatus();
    } finally {
      setLoading("");
    }
  }

  async function disconnectDesktopApp() {
    setLoading("disconnect");
    setMessage("");
    try {
      const response = await fetch("/api/monitor/token", { method: "DELETE" });
      if (!response.ok) {
        setMessage("Failed to disconnect monitor.");
        return;
      }
      setToken("");
      setMessage("Desktop monitor disconnected.");
      await loadStatus();
    } finally {
      setLoading("");
    }
  }

  async function deleteMonitorData() {
    setLoading("delete-data");
    setMessage("");
    try {
      const response = await fetch("/api/monitor/data", { method: "DELETE" });
      if (!response.ok) {
        setMessage("Failed to delete monitor data.");
        return;
      }
      setToken("");
      setMessage("All monitor data deleted successfully.");
      await loadStatus();
    } finally {
      setLoading("");
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">Desktop Connection</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Generate a secure token and paste it in the PayXen Monitor desktop app to start syncing usage.
      </p>

      <div className="mt-4 rounded-xl border bg-muted/20 p-4">
        <p className="text-sm font-medium">
          Status:{" "}
          <span className={status?.connected ? "text-emerald-400" : "text-zinc-400"}>
            {statusLabel}
          </span>
        </p>
        {status?.expiresAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Token expires at: {new Date(status.expiresAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3 rounded-xl border bg-muted/20 p-4">
        <label className="flex items-start gap-2 text-sm">
          <input
            className="mt-0.5"
            type="checkbox"
            checked={consented}
            onChange={(event) => setConsented(event.target.checked)}
          />
          <span>
            I have read and agree to the Terms and Conditions and Privacy Policy. I consent to focused
            service-level time tracking only.
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button disabled={!canConnect} onClick={connectDesktopApp}>
            {loading === "connect" ? "Generating..." : "Generate Connection Token"}
          </Button>
          <Button variant="outline" disabled={loading !== ""} onClick={disconnectDesktopApp}>
            {loading === "disconnect" ? "Disconnecting..." : "Disconnect Account"}
          </Button>
          <Button variant="destructive" disabled={loading !== ""} onClick={deleteMonitorData}>
            {loading === "delete-data" ? "Deleting..." : "Delete My Monitor Data"}
          </Button>
        </div>
      </div>

      {token ? (
        <div className="mt-4 rounded-xl border border-amber-800 bg-amber-950 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-400">One-time token</p>
          <p className="mt-2 break-all rounded-md bg-muted p-3 font-mono text-xs">{token}</p>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
    </section>
  );
}

