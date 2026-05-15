# LaundryPing migrations

Local migrations use sequential `NNNNN_name.sql` naming (e.g. `00001_initial_schema.sql`).
`00001_initial_schema.sql` is a squashed baseline that consolidates the project's earlier
history; the remote Supabase project tracks pre-baseline migrations under their original
timestamp-style names (`YYYYMMDDHHMMSS_name`), which don't appear in this repo.

## Note: remote migration not in repo

The remote DB has one extra migration not present here:

- `20260503031445_job_phases_revoke_trigger_execute` — applied between 00003 and 00004
  during the v1.10.1 hardening pass. Its content was a single line:
  `REVOKE EXECUTE ON FUNCTION public.sync_job_from_phases() FROM PUBLIC, anon, authenticated;`

The same `REVOKE EXECUTE` is also baked into the bottom of `00004_job_phases_security_and_trigger.sql`,
`00005_phase_trigger_mid_flow.sql`, and `00006_v1_10_1_hardening.sql`, so a fresh
`supabase db reset` ends up in the correct state. The missing migration file matters only
for step-wise replays: if 00003 lands without 00004 immediately after, the SECURITY DEFINER
trigger function would be briefly callable via PostgREST RPC. In practice all migrations
ship together.

## Adding new migrations

1. `ls supabase/migrations/` and pick the next free prefix.
2. Name it `<prefix>_short_snake_case.sql`.
3. Apply via Supabase MCP (`apply_migration`) or `supabase db push` once committed.
