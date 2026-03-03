import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { initMonitorApp } from "../app";

type PageName = "home" | "authentication" | "usage" | "settings";
type LoginTab = "email" | "token";

/* ─── Lucide-style SVG icons (18×18, stroke 1.5) ─── */
const icons: Record<PageName, JSX.Element> = {
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  authentication: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  usage: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="m7 11 4-4 4 4 6-6" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

/* Google "G" logo SVG */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09a7.18 7.18 0 0 1 0-4.17V7.07H2.18A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.28 5.41l3.56-2.76.01-.56z" fill="#FBBC05"/>
    <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335"/>
  </svg>
);

const navItems: { page: PageName; label: string }[] = [
  { page: "home", label: "Home" },
  { page: "authentication", label: "Authentication" },
  { page: "usage", label: "Usage" },
  { page: "settings", label: "Settings" },
];

const pageTitles: Record<PageName, string> = {
  home: "PayXen Monitor — Home",
  authentication: "PayXen Monitor — Authentication",
  usage: "PayXen Monitor — Usage",
  settings: "PayXen Monitor — Settings",
};

const pageSubtitles: Record<PageName, string | null> = {
  home: "Focused-time tracking for approved services only. Your browsing history is never captured.",
  authentication: null,
  usage: null,
  settings: null,
};

declare global {
  interface Window {
    payxenMonitor: {
      getState: () => Promise<{ connected: boolean; backendBaseUrl: string; [k: string]: unknown }>;
      loginWithEmail: (p: { backendBaseUrl: string; email: string; password: string }) => Promise<unknown>;
      loginWithGoogle: (p: { backendBaseUrl: string }) => Promise<unknown>;
      connectWithToken: (p: { backendBaseUrl: string; token: string }) => Promise<unknown>;
      disconnectAccount: () => Promise<unknown>;
      onStatus: (cb: (s: { connected: boolean; [k: string]: unknown }) => void) => () => void;
      [k: string]: unknown;
    };
  }
}

/* ═══════════════════════════════════════════════════════════
 *  Login Screen
 * ═══════════════════════════════════════════════════════════ */

function LoginScreen(props: { onConnected: () => void }) {
  const [tab, setTab] = useState<LoginTab>("email");
  const [backendUrl, setBackendUrl] = useState("http://localhost:3000");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* Restore backend URL from last session */
  useEffect(() => {
    window.payxenMonitor.getState().then((state) => {
      if (state.backendBaseUrl) setBackendUrl(state.backendBaseUrl);
    });
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await window.payxenMonitor.loginWithEmail({
        backendBaseUrl: backendUrl.trim(),
        email: email.trim(),
        password,
      });
      props.onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await window.payxenMonitor.loginWithGoogle({
        backendBaseUrl: backendUrl.trim(),
      });
      props.onConnected();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google login failed.";
      if (msg !== "Google login was cancelled.") setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await window.payxenMonitor.connectWithToken({
        backendBaseUrl: backendUrl.trim(),
        token: token.trim(),
      });
      props.onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const anyLoading = loading || googleLoading;

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div>
            <p className="brand-eyebrow">PayXen</p>
            <h1>Monitor</h1>
          </div>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">
          Sign in to connect this desktop agent to your PayXen account.
        </p>

        {/* Backend URL — shared across all methods */}
        <label className="field">
          <span>Backend URL</span>
          <input
            type="url"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="https://your-payxen-domain.com"
            disabled={anyLoading}
          />
        </label>

        {/* Google Sign-In */}
        <div style={{ marginTop: 16 }}>
          <button
            className="button-google"
            onClick={handleGoogleLogin}
            disabled={anyLoading}
          >
            {googleLoading ? (
              <span>Signing in…</span>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        <div className="login-divider">or</div>

        {/* Tab bar: Email | JWT Token */}
        <div className="login-tabs">
          <button
            className={`login-tab${tab === "email" ? " is-active" : ""}`}
            onClick={() => { setTab("email"); setError(""); }}
            disabled={anyLoading}
          >
            Email &amp; Password
          </button>
          <button
            className={`login-tab${tab === "token" ? " is-active" : ""}`}
            onClick={() => { setTab("token"); setError(""); }}
            disabled={anyLoading}
          >
            JWT Token
          </button>
        </div>

        {/* ── Email + Password ── */}
        <div className={`login-section${tab === "email" ? " is-visible" : ""}`}>
          <form onSubmit={handleEmailLogin}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={anyLoading}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={anyLoading}
              />
            </label>
            <span className="login-forgot" title="Coming soon">
              Forgot password?
            </span>
            <div className="button-row">
              <button
                type="submit"
                className="button"
                style={{ width: "100%" }}
                disabled={anyLoading}
              >
                {loading && tab === "email" ? "Signing in…" : "Sign In"}
              </button>
            </div>
          </form>
        </div>

        {/* ── JWT Token ── */}
        <div className={`login-section${tab === "token" ? " is-visible" : ""}`}>
          <form onSubmit={handleTokenLogin}>
            <label className="field">
              <span>Monitor JWT Token</span>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from PayXen web app"
                required
                disabled={anyLoading}
              />
            </label>
            <div className="button-row">
              <button
                type="submit"
                className="button"
                style={{ width: "100%" }}
                disabled={anyLoading}
              >
                {loading && tab === "token" ? "Verifying…" : "Connect with Token"}
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <p className="login-footer">
          No account? Contact your PayXen administrator.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  Main Dashboard (existing content)
 * ═══════════════════════════════════════════════════════════ */

function Dashboard(props: { onSignOut: () => void }) {
  const [page, setPage] = useState<PageName>("home");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    document.title = pageTitles[page];
  }, [page]);

  useEffect(() => {
    void initMonitorApp();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await window.payxenMonitor.disconnectAccount();
      props.onSignOut();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <div className="app-shell">
      {/* ─── Persistent sidebar ─── */}
      <aside className="sidebar">
        <div className="brand">
          <div>
            <p className="brand-eyebrow">PayXen</p>
            <h1>Monitor</h1>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.page}
              className={`nav-item${page === item.page ? " is-active" : ""}`}
              onClick={() => setPage(item.page)}
            >
              {icons[item.page]}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p id="sidebar-service-status" className="status-pill">
            Tracking: Active
          </p>
          <button
            className="button button-ghost button-full"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{ marginBottom: 6 }}
          >
            {signingOut ? "Signing out…" : "Sign Out"}
          </button>
          <button id="quit-app" className="button button-ghost button-full">
            Quit PayXen Monitor
          </button>
        </div>
      </aside>

      {/* ─── Content area ─── */}
      <main className="content">
        <header className="content-header card">
          <div>
            <p className="eyebrow">Desktop Monitoring Agent</p>
            <h2>PayXen Monitor</h2>
            {pageSubtitles[page] ? (
              <p className="muted">{pageSubtitles[page]}</p>
            ) : null}
          </div>
          <span id="connection-badge" className="badge">
            Disconnected
          </span>
        </header>

        {/* Global error banner */}
        <p id="sync-error" className="error hidden"></p>

        {/* ── Home ── */}
        <section className={`page${page === "home" ? " is-visible" : ""}`}>
          <article id="consent-card" className="card">
            <h3>Privacy Consent</h3>
            <p className="muted">
              Usage tracking requires your explicit consent before it can begin.
            </p>
            <label className="checkbox-row">
              <input id="consent-checkbox" type="checkbox" />
              <span>
                I agree to focused service-level tracking under PayXen Terms and
                Privacy Policy.
              </span>
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
                <strong>Tracking Service</strong>{" "}
                <span id="tracking-service-state">Active</span>
              </div>
              <div className="row">
                <strong>Active Service</strong>{" "}
                <span id="current-service">Not tracking</span>
              </div>
              <div className="row">
                <strong>Last Sync</strong>{" "}
                <span id="last-sync">Never</span>
              </div>
              <div className="row">
                <strong>Queue Size</strong>{" "}
                <span id="queue-size">0</span>
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
            </article>

            <article className="card">
              <h3>Today&apos;s Activity</h3>
              <ul id="today-summary" className="list"></ul>
            </article>
          </div>
        </section>

        {/* ── Authentication ── */}
        <section className={`page${page === "authentication" ? " is-visible" : ""}`}>
          <article className="card">
            <h3>Account Connection</h3>
            <p className="muted">
              You are signed in. To switch accounts, disconnect and sign in
              again.
            </p>

            <div id="auth-form" className="hidden">
              {/* Hidden — login is handled by the login screen now */}
              <label className="field">
                <span>Backend URL</span>
                <input
                  id="backend-url"
                  type="url"
                  placeholder="https://your-payxen-domain.com"
                />
              </label>
              <label className="field">
                <span>JWT Token</span>
                <input
                  id="monitor-token"
                  type="password"
                  placeholder="Paste token from PayXen web app"
                />
              </label>
              <div className="button-row">
                <button id="connect-token" className="button">
                  Connect Account
                </button>
              </div>
              <p id="auth-connecting" className="muted hidden">
                Verifying token&hellip;
              </p>
            </div>

            <div id="auth-profile" className="profile">
              <button
                id="remove-auth"
                className="icon-button"
                title="Disconnect account"
              >
                ✕
              </button>
              <img
                id="profile-image"
                src=""
                alt="Profile"
                className="avatar"
              />
              <div>
                <p id="profile-greeting" className="profile-greeting"></p>
                <p id="profile-email" className="muted"></p>
              </div>
            </div>
          </article>
        </section>

        {/* ── Usage ── */}
        <section className={`page${page === "usage" ? " is-visible" : ""}`}>
          <article className="card">
            <div className="split-head">
              <div>
                <h3>Subscription Usage</h3>
                <p className="muted">
                  Displays active subscriptions and today&apos;s focused session
                  time.
                </p>
              </div>
              <button id="refresh-usage" className="button button-ghost">
                Refresh
              </button>
            </div>

            <div className="row">
              <strong>Tracking Service Status</strong>{" "}
              <span id="usage-tracking-service-state">Active</span>
            </div>
            <div id="usage-cards" className="usage-grid"></div>
          </article>
        </section>

        {/* ── Settings ── */}
        <section className={`page${page === "settings" ? " is-visible" : ""}`}>
          <article className="card">
            <h3>Preferences</h3>
            <p className="muted">
              Configure how PayXen Monitor behaves on your machine.
            </p>
            <label className="checkbox-row">
              <input id="auto-start" type="checkbox" />
              <span>
                Launch PayXen Monitor automatically on Windows login
              </span>
            </label>
            <div className="button-row">
              <button id="clear-local-data" className="button button-ghost">
                Clear Local Data
              </button>
            </div>
            <p className="muted small">
              Additional preferences will be available in upcoming releases.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
 *  Root — decides whether to show Login or Dashboard
 * ═══════════════════════════════════════════════════════════ */

function App() {
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);

  /* On mount, check if user is already connected */
  useEffect(() => {
    window.payxenMonitor.getState().then((state) => {
      setConnected(state.connected);
      setReady(true);
    });

    /* Also listen for disconnect events */
    const off = window.payxenMonitor.onStatus((status) => {
      setConnected(status.connected);
    });
    return off;
  }, []);

  const handleConnected = useCallback(() => {
    setConnected(true);
  }, []);

  const handleSignOut = useCallback(() => {
    setConnected(false);
  }, []);

  if (!ready) return null; /* brief loading flash */

  return connected ? <Dashboard onSignOut={handleSignOut} /> : <LoginScreen onConnected={handleConnected} />;
}

/* ─── Mount ─── */
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
