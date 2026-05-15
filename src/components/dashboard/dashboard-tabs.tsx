'use client';

import { useState } from 'react';
import { TodaysJobsSection } from './todays-jobs-section';
import { QueueSection } from './queue-section';
import type { Job, ShopInfo } from '@/components/jobs-table/types';
import type { ServicePhaseConfigEntry } from '@/types/database';

interface DashboardTabsProps {
  todayJobs: Job[];
  queuedJobs: Job[];
  shopInfo?: ShopInfo;
  servicePhaseConfig?: Record<string, ServicePhaseConfigEntry> | null;
}

export function DashboardTabs({ todayJobs, queuedJobs, shopInfo, servicePhaseConfig }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'queue'>('jobs');
  // ready_for_pickup needs operator attention (notify + complete) — count both.
  const activeJobCount = todayJobs.filter(
    (j) => j.status === 'in_progress' || j.status === 'ready_for_pickup',
  ).length;
  // Combined view so each section can compute "is machine free" across the
  // full dashboard data (queue cards need to see in_progress jobs from
  // Today's Jobs to render Ready/Waiting cues correctly).
  const allJobs = [...todayJobs, ...queuedJobs];

  return (
    <>
      {/* Mobile: Tab bar + single section */}
      <div className="md:hidden flex flex-col gap-0 flex-1 min-h-0">
        <div className="shrink-0 flex bg-white rounded-t-xl border border-b-0 border-[#0d968b]/10 overflow-hidden">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative ${
              activeTab === 'jobs'
                ? 'text-[#0d968b]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Jobs
            {activeJobCount > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-bold ${
                activeTab === 'jobs' ? 'bg-[#0d968b]/10 text-[#0d968b]' : 'bg-slate-100 text-slate-500'
              }`}>
                {activeJobCount}
              </span>
            )}
            {activeTab === 'jobs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d968b]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors relative ${
              activeTab === 'queue'
                ? 'text-[#0d968b]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Queue
            {queuedJobs.length > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-bold ${
                activeTab === 'queue' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {queuedJobs.length}
              </span>
            )}
            {activeTab === 'queue' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0d968b]" />
            )}
          </button>
        </div>
        {activeTab === 'jobs' ? (
          <TodaysJobsSection jobs={todayJobs} allJobs={allJobs} shopInfo={shopInfo} servicePhaseConfig={servicePhaseConfig} mobileTabMode />
        ) : (
          <QueueSection jobs={queuedJobs} allJobs={allJobs} shopInfo={shopInfo} servicePhaseConfig={servicePhaseConfig} mobileTabMode />
        )}
      </div>

      {/* Desktop: Side-by-side grid */}
      <div className="hidden md:grid md:grid-cols-2 gap-6 md:flex-1 md:min-h-0">
        <TodaysJobsSection jobs={todayJobs} allJobs={allJobs} shopInfo={shopInfo} servicePhaseConfig={servicePhaseConfig} />
        <QueueSection jobs={queuedJobs} allJobs={allJobs} shopInfo={shopInfo} servicePhaseConfig={servicePhaseConfig} />
      </div>
    </>
  );
}
