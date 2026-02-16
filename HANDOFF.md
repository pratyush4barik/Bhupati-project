# PayXen Handoff (Updated)

## Project Snapshot
- Stack: `Next.js 16` + `TypeScript` + `Better Auth` + `Drizzle ORM` + `Neon Postgres`.
- Repo root: `auth/`
- Branch: `database`
- Remote: `origin https://github.com/pratyush4barik/payxen-02.git`
- Current focus area: subscription-linked groups, member lifecycle, wallet flows, request/notification UX.

## Quick Setup
Run from `auth/`:
1. `npm ci`
2. `Copy-Item .env.example .env` (or `cp .env.example .env`)
3. Fill `.env`
4. `npx drizzle-kit migrate`
5. `npm run dev`

Optional:
- `npm run setup`
- `npm run hooks:install`

## Required Env Vars
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`
- `MONITOR_JWT_SECRET`

## Auth + Session
- Server auth config: `lib/auth.ts`
- Auth route: `app/api/auth/[...all]/route.ts`
- Session helper: `lib/require-session.ts`

## Core Features (Current)

### 1) Subscriptions
Files:
- `app/subscriptions/page.tsx`
- `app/subscriptions/actions.ts`
- `app/subscriptions/checkout-submit-button.tsx`
- `app/subscriptions/plan-next-button.tsx`

Implemented:
- 4-step flow: choose app -> login/register app account -> choose plan -> checkout.
- Service account persisted in `subscription_service_accounts`.
- Checkout debits wallet and creates `subscriptions` + `transactions`.
- Free trial path supported.
- Auto-renew attempt on page load.
- Renewal failure flow: `ACTIVE -> PENDING -> INACTIVE` (~10s rule).
- Existing subscriptions list with cancel action.
- Step 3 plan cards have hover effects.
- Loading UI:
  - Step 3 Next button shows `Next...` while navigating.
  - Step 4 checkout button shows `Paying...` while submitting.

Important credential behavior:
- Service account password plain text is persisted as `subscription_service_accounts.password_plain`.
- Subscription stores `external_account_password` for downstream group usage.

### 2) Wallet
Files:
- `app/wallet/page.tsx`
- `app/wallet/actions.ts`
- `app/wallet/pending-status-refresher.tsx`
- `app/wallet/wallet-submit-button.tsx`

Implemented:
- Add money / withdraw / transfer by `px-id`.
- Unified `Transaction History` box merges:
  - `transactions`
  - sent/received `internal_transfers`
- Pending button states:
  - `Adding...`, `Withdrawing...`, `Transferring...`, `Requesting...`
- Wallet request flow:
  - Request money from another user (`px-id` + amount) from Wallet page.
  - Request appears in `/requests` (wallet requests section).
  - Receiver can `Pay now`, wallet transfer + ledger records are created.
- Internal transfer ledger via `internal_transfers` + `transactions`.

### 3) Groups - Create Flow
Files:
- `app/groups/page.tsx`
- `app/groups/actions.ts`
- `app/groups/_components/groups-builder.tsx`
- `app/groups/_components/add-members-step.tsx`
- `app/groups/_components/available-plans.tsx`
- `app/groups/_components/group-steps.tsx`
- `app/groups/types.ts`

Implemented:
- Choose active plan + member split builder.
- Backend-driven group create (`createGroupAction`).
- Validation rules:
  - at least one member required
  - total split must be exactly 100
  - member emails must be existing PayXen users
  - owner email cannot be added as member
  - duplicate member emails blocked
  - plan member count limit enforced
- Create button shows pending state (`Creating...`).
- Add member UX:
  - First added member is non-removable.
  - Delete icon appears only from additional rows (3rd person onward overall).
  - Delete icon has hover effect and removes row instantly.
  - First added member row alignment matches owner-style left icon alignment.

Plan reuse rule:
- If a subscription is already used by an ACTIVE group, it is hidden from Create Groups.

### 4) Groups - Existing / Joined / Requests
Files:
- `app/existing-groups/page.tsx`
- `app/requests/page.tsx`
- `app/groups/group-queries.ts`
- `app/groups/_components/group-card.tsx`
- `app/groups/_components/group-credentials.tsx`
- `app/groups/actions.ts`

Implemented:
- Owner groups and joined groups rendered separately.
- Joined groups include true MEMBER roles only.
- Owner always shown first in member list.
- Request flow:
  - `PENDING`: Accept or Reject
  - `ACCEPTED`: Pay now
  - successful pay -> joined groups (`PAID`)
  - insufficient wallet during pay -> status reset to `PENDING`
- Accepted request UI shows right-side payment panel (`Price`, `Wallet balance`).
- Credentials placeholder (when hidden) centered in credentials box.
- Credentials fallback chain:
  1. `group_subscriptions.external_account_*`
  2. `subscriptions.external_account_*`
  3. `subscription_service_accounts.email/password_plain`

Reject behavior (owner-impacting):
- On member reject:
  - owner gets notification
  - member removed immediately from `group_members`
  - member split deleted
  - member percentage/amount added to owner split immediately
- Legacy rejected-row cleanup added:
  - stale `REJECTED` rows are auto-processed on existing groups page load.

### 5) Groups - Owner Edit
Files:
- `app/groups/_components/group-card.tsx`
- `app/groups/actions.ts`

Implemented:
- Edit button near delete icon opens modal popup.
- Password-only edit can be saved directly.
- Member edit rules:
  - existing member percentage cannot increase
  - existing percentage can decrease or stay same
  - can add one new member per confirm flow
  - total split must remain 100
- Confirm popup shows:
  - new member email + split + price
  - owner-to-existing-member adjustment preview

Settlement behavior:
- If new member addition reduces existing non-owner member share, adjustment transfer is deferred.
- Pending settlements stored in `group_member_settlements`.
- Settlement completes only after new member accepts and pays.

### 6) Groups - Delete Request + Deleted Groups
Files:
- `app/groups/actions.ts`
- `app/groups/group-queries.ts`
- `app/deleted-groups/page.tsx`
- `app/existing-groups/page.tsx`
- `app/dashboard-01/app-sidebar.tsx`

Implemented:
- Owner delete request flow:
  - `delete_request_status = PENDING`
  - executes on/after `next_billing_date - 1 day`
- Deleted groups shown on `/deleted-groups`.
- Deleted groups removed from active owner/joined/request lists.

Member removal scheduling flow:
- Owner can schedule member removal in edit modal.
- Member row shows red pending state + scheduled date.
- Cancel removal action available.
- Executes on/after `next_billing_date - 1 day`:
  - member removed from `group_members`
  - member split marked removed
  - owner share increased by removed member share

### 7) Notifications
Files:
- `app/notifications/page.tsx`
- `app/notifications/actions.ts`
- `app/api/notifications/count/route.ts`
- `app/dashboard-01/app-sidebar.tsx`

Implemented:
- New `/notifications` page listing all notifications.
- Notifications generated for owner when member:
  - accepts group request
  - rejects group request
- Sidebar Notifications item added (bell icon) with count badge.
- Single notification delete action.
- Clear all notifications action.

### 8) Sidebar
Files:
- `app/dashboard-01/app-sidebar.tsx`

Implemented:
- Groups parent item with nested:
  - Create Groups
  - Existing Groups
  - Deleted Groups
- `Requests` badge count (pending group + pending wallet requests).
- `Notifications` badge count (unread notifications).
- Requests and Notifications use the same badge component style.

### 9) Auto Refresh
Files:
- `app/auto-refresh.tsx`
- `app/layout.tsx`

Implemented:
- Background `router.refresh` on authenticated pages.
- Pauses during interaction and for 10s after interaction.
- Includes `/notifications` in refreshable routes.

### 10) PayXen Monitor (Web + Desktop)
Web files:
- `app/payxen-monitor/page.tsx`
- `app/payxen-monitor/monitor-controls.tsx`
- `app/api/monitor/token/route.ts`
- `app/api/monitor/usage/route.ts`
- `app/api/monitor/data/route.ts`
- `app/api/monitor/me/route.ts`
- `app/api/monitor/subscriptions/route.ts`
- `app/usage/page.tsx`
- `app/usage/usage-analytics.tsx`
- `app/privacy-policy/page.tsx`
- `app/terms-and-conditions/page.tsx`
- `lib/monitor-auth.ts`
- `lib/monitor-jwt.ts`
- `lib/monitor-services.ts`

Desktop files:
- `payxen-monitor/src/main.ts`
- `payxen-monitor/src/preload.ts`
- `payxen-monitor/src/core/monitor-controller.ts`
- `payxen-monitor/src/core/tracker.ts`
- `payxen-monitor/src/core/sync.ts`
- `payxen-monitor/src/core/auth.ts`
- `payxen-monitor/src/core/storage.ts`
- `payxen-monitor/src/renderer/pages/home.tsx`
- `payxen-monitor/src/renderer/pages/authentication.tsx`
- `payxen-monitor/src/renderer/pages/usage.tsx`
- `payxen-monitor/src/renderer/pages/settings.tsx`
- `payxen-monitor/src/renderer/app.ts`
- `payxen-monitor/scripts/build-renderer.js`

Implemented:
- Monitor token issuance/revocation and bearer-authenticated usage ingestion.
- User monitor data deletion endpoint and 180-day retention pruning in ingest route.
- Monitor bearer auth profile endpoint (`/api/monitor/me`) for desktop auth UI.
- Active subscription usage endpoint (`/api/monitor/subscriptions`) for desktop usage cards.
- Website monitor page with token controls, legal links, and installer download path.
- Usage page wired to `usage_logs` with active-subscription-only filtering.
- Desktop app runs in background via tray; close hides window, explicit tray action quits app.
- Desktop auto-start persisted and enabled by default.
- Local encrypted queue storage + 60s sync loop + retry-friendly offline behavior.
- Idle-state feature was removed from desktop tracking flow.
- Renderer split into separate pages and migrated to TSX entries:
  - Home
  - Authentication
  - Usage
  - Settings
- Installer build pipeline updated for TSX renderer bundling via `esbuild`.
- Current installer artifact path used by website:
  - `public/downloads/PayXen-Monitor-Setup.exe`

## Database Schema Status
Main schema: `db/schema.ts`

Key additions:
- `subscriptions.external_account_password`
- `subscription_service_accounts.password_plain`
- `group_subscriptions.subscription_id`
- `group_subscriptions.service_key`, `plan_name`, `external_account_email`, `external_account_password`
- `group_subscriptions.delete_request_status`, `delete_requested_at`, `deleted_at`
- `group_subscription_splits.share_percentage`, `payment_status`, `paid_at`
- `group_subscription_splits.removal_request_status`, `removal_requested_at`, `removed_at`
- `group_member_settlements` table (deferred adjustment transfers)
- `wallet_money_requests` table + status enum
- `notifications` table + notification type enum

## Migrations
Current migration sequence:
- `drizzle/0000_milky_blockbuster.sql`
- `drizzle/0001_far_angel.sql`
- `drizzle/0002_wooden_wind_dancer.sql`
- `drizzle/0003_subscription_checkout_flow.sql`
- `drizzle/0004_remove_subscription_plans_table.sql`
- `drizzle/0005_unique_active_subscription_account.sql`
- `drizzle/0006_subscription_trial_pending_cancel.sql`
- `drizzle/0007_subscription_unique_per_plan.sql`
- `drizzle/0008_group_requests_and_split_payments.sql`
- `drizzle/0009_group_member_settlements.sql`
- `drizzle/0010_group_delete_request_flow.sql`
- `drizzle/0011_group_member_remove_flow.sql`
- `drizzle/0012_wallet_money_requests.sql`
- `drizzle/0013_notifications.sql`
- `drizzle/0014_payxen_monitor.sql`

Journal:
- `drizzle/meta/_journal.json`

## Routes Map
- `/login`
- `/signup`
- `/dashboard`
- `/wallet`
- `/groups`
- `/existing-groups`
- `/deleted-groups`
- `/subscriptions`
- `/requests`
- `/notifications`
- `/ghost-agent`
- `/payxen-monitor`
- `/privacy-policy`
- `/terms-and-conditions`
- `/usage`
- `/settings`
- `/api/monitor/token`
- `/api/monitor/usage`
- `/api/monitor/data`
- `/api/monitor/me`
- `/api/monitor/subscriptions`

## Security/Design Notes
- Plain-text password storage exists (`password_plain`, `external_account_password`) due to product requirement of showing app credentials in groups.
- This is functionally intentional but security-sensitive.
- Long-term recommendation: encrypted-at-rest secrets + masked retrieval flow.

## Current Working Tree (Latest Focus)
Primary recently touched areas:
- `app/groups/actions.ts` (accept/reject notify + immediate reject removal flow)
- `app/groups/group-queries.ts` (cleanup processors for stale rejected/pending removals)
- `app/wallet/*` (wallet requests + pending UI labels + transaction history merge)
- `app/notifications/*` and `app/api/notifications/count/route.ts`
- `app/dashboard-01/app-sidebar.tsx` (requests/notifications badges)
- `app/subscriptions/*` (Next... and Paying... button states)
- `app/api/monitor/*` (token issue/revoke, usage ingest, and monitor data delete endpoint)
- `lib/monitor-*.ts` (JWT auth + service normalization helpers for monitor)
- `app/payxen-monitor/*` (monitor download, onboarding, token controls)
- `app/usage/*` (active-only monitor analytics, monthly summary, inactive highlight)
- `payxen-monitor/*` (desktop Electron app with tray background runtime, TSX renderer pages, encrypted queue, 60s sync, installer setup)
- `public/downloads/PayXen-Monitor-Setup.exe` (latest generated installer)

## Recommended Next Steps
1. Validate `payxen-monitor` on Windows against staging backend (token connect, tray/background behavior, sync, revoke).
2. Publish installer artifact to website download path during release.
3. Add integration tests for monitor APIs:
   - token revocation handling
   - duplicate `source_event_id` suppression
   - retention cleanup behavior
   - `/api/monitor/me` and `/api/monitor/subscriptions` auth and payload contracts
4. Add tests for group lifecycle edge cases:
   - accept/reject/pay transitions
   - immediate reject removal and owner share reconciliation
   - scheduled member removal execution and cancel path
5. Add explicit transaction wrapping for multi-step member reject/remove operations.
6. Add notification read-state controls:
   - mark single as read/unread
   - pagination/filter by type
7. Add stronger anti-race controls:
   - lock/guard duplicate action submissions
   - idempotency keys for pay/reject flows
8. Consider moving page-load processors to cron/worker:
   - delete execution
   - scheduled member removals
   - rejected-row cleanup
