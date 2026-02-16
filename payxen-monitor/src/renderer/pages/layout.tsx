import React, { type ReactNode } from "react";

type PageName = "home" | "authentication" | "usage" | "settings";

function NavLink(props: { href: string; label: string; active: boolean }) {
  return (
    <a href={props.href} className={`nav-item${props.active ? " is-active" : ""}`}>
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
          <NavLink href="./home.html" label="Home" active={props.page === "home"} />
          <NavLink href="./authentication.html" label="Authentication" active={props.page === "authentication"} />
          <NavLink href="./usage.html" label="Usage" active={props.page === "usage"} />
          <NavLink href="./settings.html" label="Settings" active={props.page === "settings"} />
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
