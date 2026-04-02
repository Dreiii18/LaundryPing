import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/provider';
import { buildDailyPulseEmail } from '@/lib/email/templates';
import { getAdminEmailList } from '@/lib/supabase/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Fix 1: Guard against undefined CRON_SECRET bypassing auth
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fix 2: Correct UTC+8 boundary calculation using explicit offset arithmetic
    const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
    const nowUtc = new Date();
    const phTimestamp = nowUtc.getTime() + PH_OFFSET_MS;

    // Midnight PH today in UTC
    const phTodayMidnightUtc = new Date(
      Math.floor(phTimestamp / 86_400_000) * 86_400_000 - PH_OFFSET_MS
    );
    // Midnight PH yesterday in UTC
    const phYesterdayMidnightUtc = new Date(phTodayMidnightUtc.getTime() - 86_400_000);
    // 3 days ago midnight PH in UTC (for active shop detection)
    const phThreeDaysAgoUtc = new Date(phTodayMidnightUtc.getTime() - 3 * 86_400_000);
    // Fix 3: 30-day window so we can compute real daysSinceActive for inactive shops
    const phThirtyDaysAgoUtc = new Date(phTodayMidnightUtc.getTime() - 30 * 86_400_000);

    const [
      yesterdayJobsResult,
      smsSentResult,
      smsFailedResult,
      laundromatsResult,
      recentJobsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('jobs')
        .select('laundromat_id')
        .gte('created_at', phYesterdayMidnightUtc.toISOString())
        .lt('created_at', phTodayMidnightUtc.toISOString()),

      supabaseAdmin
        .from('sms_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', phYesterdayMidnightUtc.toISOString())
        .lt('sent_at', phTodayMidnightUtc.toISOString()),

      supabaseAdmin
        .from('sms_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('sent_at', phYesterdayMidnightUtc.toISOString())
        .lt('sent_at', phTodayMidnightUtc.toISOString()),

      supabaseAdmin
        .from('laundromats')
        .select('id, name, sms_free_credits, sms_paid_credits'),

      // Fix 3: Expanded to 30-day window so daysSinceActive can be computed accurately
      supabaseAdmin
        .from('jobs')
        .select('laundromat_id, created_at')
        .gte('created_at', phThirtyDaysAgoUtc.toISOString()),
    ]);

    // Fix 4: Check all query errors before proceeding
    const queryErrors = [
      yesterdayJobsResult.error,
      smsSentResult.error,
      smsFailedResult.error,
      laundromatsResult.error,
      recentJobsResult.error,
    ].filter(Boolean);

    if (queryErrors.length > 0) {
      for (const qErr of queryErrors) {
        console.error('Daily pulse query error:', qErr!.message);
      }
      return NextResponse.json(
        { success: false, error: 'Database query failures', details: queryErrors.map((e) => e!.message) },
        { status: 500 }
      );
    }

    const yesterdayJobs = yesterdayJobsResult.data ?? [];
    const allLaundromats = laundromatsResult.data ?? [];
    const recentJobs = recentJobsResult.data ?? [];

    const activeShopsYesterdaySet = new Set(yesterdayJobs.map((j) => j.laundromat_id));
    const activeShopsYesterday = activeShopsYesterdaySet.size;
    const totalShops = allLaundromats.length;
    const jobsYesterday = yesterdayJobs.length;
    const smsSent = smsSentResult.count ?? 0;
    const smsFailed = smsFailedResult.count ?? 0;

    // Fix 3: Build a map of laundromat_id → latest job created_at from the 30-day window
    const lastJobMap = new Map<string, string>();
    for (const j of recentJobs) {
      const existing = lastJobMap.get(j.laundromat_id);
      if (!existing || j.created_at > existing) {
        lastJobMap.set(j.laundromat_id, j.created_at);
      }
    }

    // Active = had a job within last 3 days
    const recentActiveSet = new Set(
      recentJobs
        .filter((j) => new Date(j.created_at).getTime() >= phThreeDaysAgoUtc.getTime())
        .map((j) => j.laundromat_id)
    );

    const inactiveShops = allLaundromats
      .filter((l) => !recentActiveSet.has(l.id))
      .map((l) => {
        const lastJob = lastJobMap.get(l.id);
        let daysSinceActive: number | null = null;
        if (lastJob) {
          // Use PH calendar day boundaries, not raw hour diff
          const jobPhDay = Math.floor((new Date(lastJob).getTime() + PH_OFFSET_MS) / 86_400_000);
          const todayPhDay = Math.floor(phTimestamp / 86_400_000);
          daysSinceActive = todayPhDay - jobPhDay;
        }
        return { name: l.name as string, daysSinceActive };
      });

    const zeroCreditsShops = allLaundromats
      .filter((l) => ((l.sms_free_credits as number) ?? 0) + ((l.sms_paid_credits as number) ?? 0) === 0)
      .map((l) => ({ name: l.name as string }));

    // Use PH "today" for the display date label
    const phTodayDate = new Date(phTimestamp);
    const dateStr = new Date(
      phTodayDate.getUTCFullYear(),
      phTodayDate.getUTCMonth(),
      phTodayDate.getUTCDate() - 1 // "yesterday" in PH time is the reporting day
    ).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const adminEmails = getAdminEmailList();
    if (adminEmails.length === 0) {
      console.log('Daily pulse: no admin emails configured, skipping');
      return NextResponse.json({ success: true, skipped: true });
    }

    const { subject, html } = buildDailyPulseEmail({
      date: dateStr,
      activeShopsYesterday,
      totalShops,
      jobsYesterday,
      smsSent,
      smsFailed,
      inactiveShops,
      zeroCreditsShops,
    });

    await Promise.all(
      adminEmails.map((adminEmail) =>
        sendEmail({ to: adminEmail, subject, html }).catch((err) =>
          console.error('Daily pulse email error:', err)
        )
      )
    );

    return NextResponse.json({
      success: true,
      date: dateStr,
      activeShopsYesterday,
      totalShops,
      jobsYesterday,
      smsSent,
      smsFailed,
      inactiveShops: inactiveShops.length,
      zeroCreditsShops: zeroCreditsShops.length,
      adminEmailsSent: adminEmails.length,
    });
  } catch (err) {
    console.error('Daily pulse cron failed:', err);
    // Fix 5: Return 500 so Vercel cron monitoring detects failures
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
