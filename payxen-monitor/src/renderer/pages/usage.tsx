import React from "react";
import { createRoot } from "react-dom/client";
import { initMonitorApp } from "../app";
import { Shell } from "./layout";

function UsagePage() {
  return (
    <Shell page="usage">
      <article className="card">
        <div className="split-head">
          <div>
            <h3>Active Subscription Usage</h3>
            <p className="muted">Shows active subscriptions only, plus today&apos;s focused usage.</p>
          </div>
          <button id="refresh-usage" className="button button-ghost">
            Refresh
          </button>
        </div>

        <div className="row">
          <strong>Tracking Service Status:</strong> <span id="usage-tracking-service-state">Active</span>
        </div>
        <div id="usage-cards" className="usage-grid"></div>
        <p id="sync-error" className="error hidden"></p>
      </article>
    </Shell>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<UsagePage />);
  void initMonitorApp();
}
