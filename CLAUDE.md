# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is LaundryPing

LaundryPing is a web app for Philippine laundromats that sends "laundry done" SMS notifications to customers via the Semaphore API. Single-tenant per account (one laundromat per user). Phase 1 MVP -- staff-facing only, customers are passive SMS recipients.

## Commands

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (flat config, Next.js core-web-vitals + typescript)
npm run test         # Vitest -- run all tests once
npm run test:watch   # Vitest -- watch mode
```

Run a single test file:
```bash
npx vitest run src/lib/utils/__tests__/phone.test.ts
```

## Architecture

**Stack**: Next.js 16 (App Router, RSC) + Supabase (Postgres + Auth + RLS) + Tailwind CSS 4 + shadcn/ui (new-york style) + Semaphore SMS API

**Path alias**: `@/*` maps to `./src/*`

### Three Supabase Clients

- `lib/supabase/server.ts` -- Server-side client using cookies (for Server Components, Route Handlers, and Server Actions). Created via `await createClient()`.
- `lib/supabase/client.ts` -- Browser client for client components. Created via `createClient()` (synchronous).
- `lib/supabase/admin.ts` -- Service role client (`supabaseAdmin`) that bypasses RLS. Used only for admin operations like signup account creation.

### Auth Pattern

- `middleware.ts` refreshes Supabase auth session on every request, redirects unauthenticated users to `/login` and authenticated users away from auth pages.
- `lib/supabase/auth-helpers.ts` exports `getAuthenticatedUser()` -- the standard way API routes get the current user + their laundromat in one call. Returns `{ user, laundromat, supabase, error }`.
- A Postgres trigger (`handle_new_user`) auto-creates a `laundromats` row on signup, so every user always has exactly one laundromat.

### Route Groups

- `(auth)/` -- Login and signup pages (public, centered layout)
- `(dashboard)/` -- Protected pages with sidebar + topbar layout. Dashboard layout does a server-side auth check and fetches laundromat data.

### SMS Subsystem (`lib/sms/`)

- `provider.ts` -- Factory pattern with `SmsProvider` interface. `SMS_PROVIDER=mock` (default) logs to console; `SMS_PROVIDER=semaphore` calls the real API with 5s AbortController timeout.
- `quota.ts` -- SMS credit management via Postgres stored procedures: `ensure_billing_cycle` (lazy monthly reset of free credits), `check_and_consume_sms_credit` (atomic consume with `SELECT ... FOR UPDATE` row locking, free credits first then paid), and `refund_sms_credit` (refund on failure). All users get 50 free SMS/month + optional purchased credits.
- `templates.ts` -- Bilingual Tagalog/English SMS message builder.
- Triple-layer duplicate SMS prevention: UI button disable + `sms_logs` check + UNIQUE constraint on `sms_logs.job_id`.

### Phone Number Handling

- Encrypted at rest using AES-256-GCM (`lib/utils/encryption.ts`). Key from `PHONE_ENCRYPTION_KEY` env var (never in DB).
- Stored as `customer_phone_encrypted` (full ciphertext) + `customer_phone_masked` (display-safe `09xx-xxx-NNNN`).
- PH phone validation and normalization in `lib/utils/phone.ts` -- handles `+63`, `63`, and `09` prefixes.

### Database

7 tables with RLS on all: `laundromats`, `machines`, `jobs`, `sms_logs`, `sms_topup_packages`, `sms_topup_logs`, `blog_posts`. Types manually defined in `types/database.ts` (not auto-generated).

**Migrations**: The local `supabase/migrations/` folder uses sequential `NNNNN_name.sql` naming (e.g. `00001_initial_schema.sql`, `00002_sms_templates.sql`). `00001_initial_schema.sql` is a squashed baseline that consolidates the project's earlier history -- the remote Supabase project tracks migrations under their original timestamp-style names (`YYYYMMDDHHMMSS_name`), which don't appear in the repo. When adding a migration, use the next free sequential prefix (check `ls supabase/migrations/`) and a descriptive snake_case name.

### SMS Credits (Free + Top-up Model)

Every user gets **50 free SMS/month** (resets on billing cycle). Additional credits are purchased via one-time top-up packs:
- **Pack 250**: 250 SMS for PHP 299
- **Pack 600**: 600 SMS for PHP 699
- **Pack 1,100**: 1,100 SMS for PHP 1,199

Key rules: Free credits reset monthly. Paid credits never expire. Free credits consumed first, then paid. All users can see SMS fields and send SMS by default (no plan gating). `sms_topup_packages` stores pack definitions. `sms_topup_logs` tracks purchase history.

Admin adds credits via the Admin Panel top-up UI (`/admin/plans`), which calls `add_sms_topup` RPC. Payment is via GCash with manual admin verification.

### Job Completion Flow (`api/jobs/[id]/complete/route.ts`)

This is the most complex route. It: verifies auth + ownership, checks notify_sms + phone (early exit if missing -- completes job without SMS), checks idempotency via `sms_logs`, ensures billing cycle (resets free credits if new month), atomically consumes one SMS credit (free first, then paid), decrypts the phone number, sends SMS, and handles all failure modes (no credits, decryption failure, SMS failure) by refunding the credit and completing the job without SMS.

## Environment Variables

See `.env.local.example`. Set `SMS_PROVIDER=mock` for development (no real SMS sent). Generate encryption key: `openssl rand -hex 32`.

## Testing

Tests live in `__tests__/` directories next to the code they test. Vitest with jsdom environment and `@testing-library/jest-dom` matchers. Tests cover utility functions and SMS logic only (no component/integration tests yet).

## Validation

Zod v4 for request body validation in API routes. react-hook-form + @hookform/resolvers for client-side forms.
