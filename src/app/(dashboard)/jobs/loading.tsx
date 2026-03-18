export default function JobsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 mb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-28 bg-slate-200 rounded-lg" />
        ))}
        <div className="h-9 flex-1 min-w-[160px] bg-slate-100 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-5 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-100 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-12 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-4 flex-1 bg-slate-100 rounded" />
              <div className="h-4 w-14 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
