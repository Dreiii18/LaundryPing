# LaundryPing Phase 1 MVP -- Executive Summary

**Version:** 1.1 | **Date:** 2026-02-19 | **Status:** Final

---

## What Is LaundryPing?

LaundryPing is a lightweight web application that sends "laundry done" SMS notifications to customers of Philippine laundromats. It replaces the current manual process -- phone calls from the staff's personal phone, Viber messages, or simply telling customers "come back in 2 hours" -- with a simple tap-to-notify system that works on every phone with an active SIM.

## The Problem: "Tapos na ba yung labada ko?"

Every day, thousands of Philippine laundromat customers ask: "Is my laundry done yet?" The vast majority of independent PH laundromats (estimated 80-90%) use paper logbooks and manual phone calls. Staff lose 60-90 minutes daily to status inquiries. Unclaimed laundry blocks machine capacity. There is no reliable, universal notification system. LaundryPing competes with nothing -- it replaces a paper notebook and a phone call.

## Who Uses It?

| Persona | Profile | Key Need |
|---------|---------|----------|
| **Owner** ("Ate/Kuya Boss") | Age 35-60, owns 1-3 shops, PHP 15K-50K/month profit, Android user | Look professional, reduce complaints, keep costs under PHP 500-1K/month |
| **Staff** (Attendant) | Age 18-30, PHP 400-610/day wage, smartphone-native, low patience for slow UIs | Speed (tap-tap-done), clear confirmation that SMS was sent, not using personal phone credits |
| **Customer** | Wide age range, 95% prepaid SIM, SMS reaches even PHP 500 feature phones | Get notified when laundry is ready. One text per job. No spam. |

## How It Works

**Tech Stack:** Next.js 15 (App Router) + Supabase (Postgres + Auth) + Semaphore SMS API

**Core Flow:** Staff opens dashboard -> taps "Start new job" -> selects machine + enters customer phone -> customer's phone is encrypted and stored -> when laundry is done, staff taps "Mark done" -> system sends bilingual Tagalog/English SMS -> customer picks up laundry.

**Free Tier:** 50 SMS per month per laundromat (platform cost: PHP 25/month at PHP 0.50/SMS via Semaphore). Enough for approximately 2 days of a busy shop's volume, designed to prove value before paid conversion.

## Key Numbers

| Metric | Value |
|--------|-------|
| Functional requirements | 78 (AUTH: 11, MACH: 16, JOB: 21, SMS: 16, DASH: 9, SET: 6) |
| Non-functional requirements | 25 |
| Acceptance criteria | 18 (AC-01 through AC-18, covering 47 test scenarios) |
| Features in build plan | 19 |
| Estimated effort | 61-87 hours (2-3 weeks full-time) |
| Critical path | ~38 hours (5 days full-time) |
| SQL tables | 4 (laundromats, machines, jobs, sms_logs) + 2 stored procedures |
| Mermaid diagrams | 4 (system topology, data flow, job lifecycle, ERD) |

## Critical Technical Decisions

1. **App-level AES-256-GCM encryption** for phone numbers (key never touches database; smaller breach blast radius than pgcrypto)
2. **Semaphore** as SMS provider (PHP 0.50/SMS, all PH networks including DITO, strong PH dev community)
3. **Lazy billing reset with stored procedure** (works on Supabase free tier without pg_cron; idempotent SQL prevents race conditions)
4. **Three-layer double-send prevention** (UI button disable + sms_logs check + UNIQUE constraint)
5. **Atomic SMS quota check** via Postgres stored procedure with `SELECT ... FOR UPDATE` row locking
6. **5-second SMS API timeout** with AbortController to prevent staff being blocked by hung API calls
7. **Rate limiting** (60 req/min per session) and job count limits to prevent abuse via exposed anon key

## What Is NOT in Phase 1

- Payment processing
- Multi-branch support
- User roles and permissions (one shared account per shop)
- Customer-facing features (customers are passive SMS recipients)
- Booking / queue system
- Analytics dashboards (manual DB queries suffice)
- Native mobile apps or PWA
- SMS template customization
- Forgot password flow (use Supabase Admin console)
- SMS delivery confirmation webhooks

## Key Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Staff revert to paper logbook (app too slow/complex) | HIGH | Sub-15s job creation. Single-tap Mark Done. Observe real attendants during pilot. |
| 2 | Owners won't pay after free tier | HIGH | 50 SMS proves value in ~2 days. GCash/Maya payment. "PHP 0.50/SMS < calling" framing. |
| 3 | SMS delivery unreliable on certain networks (DITO, TNT) | MEDIUM | Log everything. UI says "sent" not "delivered." Staff backup: call after 15 min. |
| 4 | Session expiry during Mark Done causes silent failure | CRITICAL | AUTH-11 requires redirect to login with toast; job status unchanged on 401. |
| 5 | SMS quota race condition on concurrent requests | CRITICAL | Atomic stored procedure with row-level locking (`check_and_increment_sms_quota`). |

## Phase 1 Go-to-Market

The first 10-20 shops must be recruited through direct outreach -- walking into laundromats, posting in Facebook groups for laundromat owners, and personal network referrals. Phase 1 is about learning, not marketing. Every early shop should be personally onboarded to gather feedback on staff adoption and SMS reception.

## Document Reference

The full PRD (`PRD.md`, ~1800 lines) contains:
- Sections 1-5: Product context, problem, personas, competition, user stories
- Section 6: 78 functional requirements across 6 domains
- Section 7: 25 non-functional requirements
- Sections 8-9: Architecture, tech stack, 12 key decisions
- Section 10: Database schema (4 tables, RLS, trigger, encryption, stored procedures, Supabase client setup)
- Section 11: SMS integration (provider comparison, API code, template, error handling, cost tracking)
- Section 12: UI/UX integration plan (5 screens, gap analysis, sidebar reconciliation)
- Section 13: MoSCoW prioritization + 18 acceptance criteria (47 test scenarios)
- Section 14: Implementation plan (19 features, 3-week build order, risk register, go-to-market)

---

*This summary reflects PRD v1.1 (Final), dated 2026-02-19.*
