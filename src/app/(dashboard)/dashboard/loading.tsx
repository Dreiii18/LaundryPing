export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="h-4 w-36 bg-slate-200 rounded mb-3" />
            <div className="h-10 w-24 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="h-5 w-32 bg-slate-200 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-4 flex-1 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
