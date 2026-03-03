import React from "react";
import { createRoot } from "react-dom/client";
import { initMonitorApp } from "../app";
import { Shell } from "./layout";

function SettingsPage() {
  return (
    <Shell page="settings">
      <article className="card">
        <h3>Preferences</h3>
        <p className="muted">Configure how PayXen Monitor behaves on your machine.</p>
        <label className="checkbox-row">
          <input id="auto-start" type="checkbox" />
          <span>Launch PayXen Monitor automatically on Windows login</span>
        </label>
        <div className="button-row">
          <button id="clear-local-data" className="button button-ghost">
            Clear Local Data
          </button>
        </div>
        <p className="muted small">Additional preferences will be available in upcoming releases.</p>
        <p id="sync-error" className="error hidden"></p>
      </article>
    </Shell>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<SettingsPage />);
  void initMonitorApp();
}
