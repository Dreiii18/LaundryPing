import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/provider';
import {
  buildD2NoMachineEmail,
  buildD7NoSmsEmail,
  buildD30RecapEmail,
} from '@/lib/email/templates';
import { daysSincePh } from '@/lib/utils/time';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://laundryping.com';
const ONBOARDING_URL = `${SITE_URL}/onboarding`;
const DASHBOARD_URL = `${SITE_URL}/dashboard`;
const DAY_MS = 86_400_000;

type LaundromatRow = Pick<
  Database['public']['Tables']['laundromats']['Row'],
  | 'id'
  | 'user_id'
  | 'name'
  | 'created_at'
  | 'sms_free_credits'
  | 'd2_email_sent_at'
  | 'd7_email_sent_at'
  | 'd30_email_sent_at'
  | 'onboarding_completed_at'
>;

type Stage = 'd2' | 'd7' | 'd30';

interface SendOutcome {
  laundromatId: string;
  stage: Stage;
  ok: boolean;
  reason?: string;
}

function authorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const provided = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Push the eligibility filter to SQL: only fetch rows old enough for D2
    // (the oldest stage cutoff) AND with at least one stage still pending.
    // The partial index idx_laundromats_lifecycle_pending serves this query.
    const cutoffD2 = new Date(Date.now() - 2 * DAY_MS).toISOString();
    const { data: laundromats, error: fetchError } = await supabaseAdmin
      .from('laundromats')
      .select(
        'id, user_id, name, created_at, sms_free_credits, d2_email_sent_at, d7_email_sent_at, d30_email_sent_at, onboarding_completed_at'
      )
      .lt('created_at', cutoffD2)
      .or('d2_email_sent_at.is.null,d7_email_sent_at.is.null,d30_email_sent_at.is.null');

    if (fetchError) {
      console.error('Lifecycle emails fetch error:', fetchError.message);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    const rows = (laundromats ?? []) as LaundromatRow[];

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        scanned: 0,
        candidates: 0,
        sent: 0,
        failed: 0,
        outcomes: [],
      });
    }

    // Batch-fetch user emails in one (or a few) admin calls instead of N
    // separate getUserById round-trips. Builds a Map<userId, email>.
    const userIds = new Set(rows.map((r) => r.user_id));
    const emailByUserId = await fetchEmailsForUsers(userIds);

    const outcomes = await Promise.all(rows.map((row) => processLaundromat(row, emailByUserId)));
    const flat = outcomes.flat();

    return NextResponse.json({
      success: true,
      scanned: rows.length,
      candidates: rows.length,
      sent: flat.filter((o) => o.ok).length,
      failed: flat.filter((o) => !o.ok).length,
      outcomes: flat,
    });
  } catch (err) {
    console.error('Lifecycle emails cron failed:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

async function fetchEmailsForUsers(userIds: Set<string>): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    for (const u of data.users) {
      if (userIds.has(u.id) && u.email) result.set(u.id, u.email);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return result;
}

async function processLaundromat(
  row: LaundromatRow,
  emailByUserId: Map<string, string>
): Promise<SendOutcome[]> {
  const days = daysSincePh(row.created_at);

  // Determine which stages this row is eligible for (age + not-yet-sent).
  // Per-stage business gates (e.g. "still no machine" for D2) are applied below.
  const eligibleStages: Stage[] = [];
  if (days >= 2 && !row.d2_email_sent_at) eligibleStages.push('d2');
  if (days >= 7 && !row.d7_email_sent_at) eligibleStages.push('d7');
  if (days >= 30 && !row.d30_email_sent_at) eligibleStages.push('d30');

  if (eligibleStages.length === 0) return [];

  const email = emailByUserId.get(row.user_id);
  if (!email) {
    // One outcome per stage so the operator log accurately attributes the failure.
    return eligibleStages.map((stage) => ({
      laundromatId: row.id,
      stage,
      ok: false,
      reason: 'no_email',
    }));
  }

  const outcomes: SendOutcome[] = [];

  // D2 — no machine yet
  if (eligibleStages.includes('d2')) {
    const { count: machineCount } = await supabaseAdmin
      .from('machines')
      .select('id', { count: 'exact', head: true })
      .eq('laundromat_id', row.id)
      .in('status', ['active', 'maintenance']);

    if ((machineCount ?? 0) === 0) {
      const { subject, html } = buildD2NoMachineEmail({
        shopName: row.name,
        onboardingUrl: ONBOARDING_URL,
      });
      const ok = await stampThenSend(email, subject, html, row.id, 'd2_email_sent_at');
      outcomes.push({ laundromatId: row.id, stage: 'd2', ok });
    }
  }

  // D7 — no successful SMS yet
  if (eligibleStages.includes('d7')) {
    const { count: smsSentCount } = await supabaseAdmin
      .from('sms_logs')
      .select('id', { count: 'exact', head: true })
      .eq('laundromat_id', row.id)
      .eq('status', 'sent');

    if ((smsSentCount ?? 0) === 0) {
      const { subject, html } = buildD7NoSmsEmail({
        shopName: row.name,
        appUrl: DASHBOARD_URL,
      });
      const ok = await stampThenSend(email, subject, html, row.id, 'd7_email_sent_at');
      outcomes.push({ laundromatId: row.id, stage: 'd7', ok });
    }
  }

  // D30 — unconditional recap
  if (eligibleStages.includes('d30')) {
    const [{ count: jobsCount }, { count: smsSent }] = await Promise.all([
      supabaseAdmin
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('laundromat_id', row.id),
      supabaseAdmin
        .from('sms_logs')
        .select('id', { count: 'exact', head: true })
        .eq('laundromat_id', row.id)
        .eq('status', 'sent'),
    ]);

    const { subject, html } = buildD30RecapEmail({
      shopName: row.name,
      appUrl: DASHBOARD_URL,
      jobsCount: jobsCount ?? 0,
      smsSent: smsSent ?? 0,
      freeCreditsRemaining: row.sms_free_credits,
    });
    const ok = await stampThenSend(email, subject, html, row.id, 'd30_email_sent_at');
    outcomes.push({ laundromatId: row.id, stage: 'd30', ok });
  }

  return outcomes;
}

// Stamp-first idempotency: write the timestamp BEFORE sending. If the send
// fails, roll the stamp back to NULL so the next cron run will retry.
// Failure mode flips from "duplicate sends on transient stamp errors" to
// "may miss this cycle, retries tomorrow" — much better trust profile.
async function stampThenSend(
  to: string,
  subject: string,
  html: string,
  laundromatId: string,
  column: 'd2_email_sent_at' | 'd7_email_sent_at' | 'd30_email_sent_at'
): Promise<boolean> {
  const stampedAt = new Date().toISOString();
  const { error: stampError } = await supabaseAdmin
    .from('laundromats')
    .update({ [column]: stampedAt })
    .eq('id', laundromatId);

  if (stampError) {
    console.error(`Lifecycle ${column} stamp failed for ${laundromatId}:`, stampError.message);
    return false;
  }

  const result = await sendEmail({ to, subject, html });
  if (!result.success) {
    console.error(`Lifecycle ${column} send failed for ${laundromatId}:`, result.error);
    // Roll back the stamp so the next cron run retries.
    const { error: rollbackError } = await supabaseAdmin
      .from('laundromats')
      .update({ [column]: null })
      .eq('id', laundromatId);
    if (rollbackError) {
      console.error(
        `[STAMP LEAK] Lifecycle ${column} rollback failed for ${laundromatId}:`,
        rollbackError.message
      );
    }
    return false;
  }

  return true;
}
