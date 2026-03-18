export default function SmsHistoryLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-28 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-48 bg-slate-100 rounded" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50">
          {[32, 24, 20, 24].map((w, i) => (
            <div key={i} className={`h-3 w-${w} bg-slate-200 rounded`} />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-32 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-5 w-16 bg-slate-200 rounded-full" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
