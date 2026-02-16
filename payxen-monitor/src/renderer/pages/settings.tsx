import React from "react";
import { createRoot } from "react-dom/client";
import { initMonitorApp } from "../app";
import { Shell } from "./layout";

function SettingsPage() {
  return (
    <Shell page="settings">
      <article className="card">
        <h3>Settings</h3>
        <label className="checkbox-row">
          <input id="auto-start" type="checkbox" />
          <span>Start PayXen Monitor automatically on Windows login</span>
        </label>
        <div className="button-row">
          <button id="clear-local-data" className="button button-ghost">
            Delete Local Unsynced Data
          </button>
        </div>
        <p className="muted small">More settings will be added in future releases.</p>
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
