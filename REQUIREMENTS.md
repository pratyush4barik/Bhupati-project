# PayXen Requirements and Setup

## System Requirements
- Node.js 20+
- npm 10+
- Neon PostgreSQL database
- Google OAuth credentials

## First-Time Setup
1. Copy environment template:
   - `cp .env.example .env` (Linux/macOS)
   - `Copy-Item .env.example .env` (PowerShell)
2. Fill all values in `.env`.
3. Install dependencies and run migrations:
   - `npm run setup`

## Run App
- `npm run dev`

## Auto-Install Dependencies After `git pull`
Run once inside this repo:
- `npm run hooks:install`

This enables `.githooks/post-merge` so every pull/merge:
- checks if `package.json` or `package-lock.json` changed
- runs `npm ci` automatically when needed

## Typical Pull Flow
1. `git pull`
2. (auto hook runs `npm ci` if package files changed)
3. `npx drizzle-kit migrate` (if new DB migrations were pulled)
4. `npm run dev`
