import React, { type ReactNode } from "react";

type PageName = "home" | "authentication" | "usage" | "settings";

/* Inline Lucide-style SVG icons (18×18, strokeWidth 1.5) */
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

function NavLink(props: { href: string; page: PageName; label: string; active: boolean }) {
  return (
    <a href={props.href} className={`nav-item${props.active ? " is-active" : ""}`}>
      {icons[props.page]}
      {props.label}
    </a>
  );
}

export function Shell(props: {
  page: PageName;
  titleSubtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"></div>
          <div>
            <p className="brand-eyebrow">PayXen</p>
            <h1>Monitor</h1>
          </div>
        </div>

        <nav className="nav">
          <NavLink href="./home.html" page="home" label="Home" active={props.page === "home"} />
          <NavLink href="./authentication.html" page="authentication" label="Authentication" active={props.page === "authentication"} />
          <NavLink href="./usage.html" page="usage" label="Usage" active={props.page === "usage"} />
          <NavLink href="./settings.html" page="settings" label="Settings" active={props.page === "settings"} />
        </nav>

        <div className="sidebar-footer">
          <p id="sidebar-service-status" className="status-pill">
            Tracking: Active
          </p>
          <button id="quit-app" className="button button-ghost button-full">
            Quit PayXen Monitor
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="content-header card">
          <div>
            <p className="eyebrow">Desktop Monitoring Agent</p>
            <h2>PayXen Monitor</h2>
            {props.titleSubtitle ? <p className="muted">{props.titleSubtitle}</p> : null}
          </div>
          <span id="connection-badge" className="badge">
            Disconnected
          </span>
        </header>
        {props.children}
      </main>
    </div>
  );
}
