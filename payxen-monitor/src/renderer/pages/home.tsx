import React from "react";
import { createRoot } from "react-dom/client";
import { initMonitorApp } from "../app";
import { Shell } from "./layout";

function HomePage() {
  return (
    <Shell page="home" titleSubtitle="Focused-time tracking for approved services only. Your browsing history is never captured.">
      <article id="consent-card" className="card">
        <h3>Privacy Consent</h3>
        <p className="muted">Usage tracking requires your explicit consent before it can begin.</p>
        <label className="checkbox-row">
          <input id="consent-checkbox" type="checkbox" />
          <span>I agree to focused service-level tracking under PayXen Terms and Privacy Policy.</span>
        </label>
        <div className="button-row">
          <button id="open-terms" className="button button-ghost">
            Terms
          </button>
          <button id="open-privacy" className="button button-ghost">
            Privacy
          </button>
        </div>
      </article>

      <div className="grid-2">
        <article className="card">
          <h3>Tracking Status</h3>
          <div className="row">
            <strong>Tracking Service:</strong> <span id="tracking-service-state">Active</span>
          </div>
          <div className="row">
            <strong>Active Service:</strong> <span id="current-service">Not tracking</span>
          </div>
          <div className="row">
            <strong>Last Sync:</strong> <span id="last-sync">Never</span>
          </div>
          <div className="row">
            <strong>Queue Size:</strong> <span id="queue-size">0</span>
          </div>
          <div className="button-row">
            <button id="toggle-tracking" className="button">
              Turn Tracking On
            </button>
            <button id="pause-tracking" className="button button-ghost">
              Pause Tracking
            </button>
          </div>
          <p id="sync-status" className="muted small"></p>
          <p id="sync-error" className="error hidden"></p>
        </article>

        <article className="card">
          <h3>Today’s Activity</h3>
          <ul id="today-summary" className="list"></ul>
        </article>
      </div>
    </Shell>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<HomePage />);
  void initMonitorApp();
}
