import React from "react";
import { createRoot } from "react-dom/client";
import { initMonitorApp } from "../app";
import { Shell } from "./layout";

function AuthenticationPage() {
  return (
    <Shell page="authentication">
      <article className="card">
        <h3>Monitor Authentication</h3>
        <p className="muted">Connect this desktop app with your PayXen account using monitor JWT.</p>

        <div id="auth-form">
          <label className="field">
            <span>Backend URL</span>
            <input id="backend-url" type="url" placeholder="https://your-payxen-domain.com" />
          </label>
          <label className="field">
            <span>JWT Token</span>
            <input id="monitor-token" type="password" placeholder="Paste token from PayXen web app" />
          </label>
          <div className="button-row">
            <button id="connect-token" className="button">
              Connect
            </button>
          </div>
          <p id="auth-connecting" className="muted hidden">
            Verifying token...
          </p>
        </div>

        <div id="auth-profile" className="profile hidden">
          <button id="remove-auth" className="icon-button" title="Remove auth">
            X
          </button>
          <img id="profile-image" src="" alt="Profile" className="avatar" />
          <div>
            <p id="profile-greeting" className="profile-greeting"></p>
            <p id="profile-email" className="muted"></p>
          </div>
        </div>

        <p id="sync-error" className="error hidden"></p>
      </article>
    </Shell>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<AuthenticationPage />);
  void initMonitorApp();
}
