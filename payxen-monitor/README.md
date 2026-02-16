# PayXen Monitor (Desktop Agent)

PayXen Monitor is a Windows desktop application that tracks focused time for approved services only and syncs usage to PayXen over HTTPS.

## Features

- Focused-window tracking for approved service list only.
- Idle detection (does not count idle time).
- Consent-gated activation.
- Secure token-based sync (`POST /api/monitor/usage`).
- Encrypted local queue for offline retry.
- Sync interval: every 60 seconds.
- Auto-start on Windows login.
- Disconnect account and local data deletion controls.

## Service Scope

Netflix, Amazon Prime, Disney+, HBO Max, Apple TV+, Spotify, Apple Music, YouTube Music, Gaana, JioSaavn, Google One, Microsoft 365, Canva, Notion, ChatGPT, Xbox, PlayStation, Steam, Coursera, Udemy, MasterClass.

## Prerequisites

- Node.js 20+
- Windows 10+ for packaged installer target
- PayXen backend URL (HTTPS in production)
- Monitor token generated from `/payxen-monitor` in web app

## Run in Development

```bash
cd payxen-monitor
npm install
npm run dev
```

## Build Windows Installer

```bash
cd payxen-monitor
npm install
npm run dist:win
```

Installer output is written to `payxen-monitor/release/`.

## Production Configuration

- Set backend URL in app UI to your deployed Next.js domain, for example `https://app.payxen.com`.
- Keep monitor token private; rotate by generating a new token from the web app.
- Use HTTPS in production. The desktop app only accepts HTTPS endpoints, with `http://localhost` allowed for local development.

## Uninstall Behavior

- NSIS uninstaller is generated with the installer.
- Uninstall removes app binaries and configured app data (`deleteAppDataOnUninstall: true`).
