export default function MachinesLoading() {
  return (
    <div className="animate-pulse">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-24 bg-slate-200 rounded" />
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 bg-slate-50">
          {[40, 24, 20, 20, 16].map((w, i) => (
            <div key={i} className={`h-3 w-${w} bg-slate-200 rounded`} />
          ))}
        </div>
        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-100 rounded-full" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
