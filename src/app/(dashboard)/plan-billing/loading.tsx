export default function PlanBillingLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-64 bg-slate-100 rounded" />
      </div>

      <div className="space-y-8">
        {/* Credit balance card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="h-5 w-28 bg-slate-200 rounded" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
                  <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                  <div className="h-2 w-full bg-slate-200 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Packages skeleton */}
        <div>
          <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="h-5 w-24 bg-slate-200 rounded mb-2" />
                <div className="h-8 w-20 bg-slate-200 rounded mb-3" />
                <div className="h-4 w-full bg-slate-100 rounded mb-4" />
                <div className="h-10 w-full bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
