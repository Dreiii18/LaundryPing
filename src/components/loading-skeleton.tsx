export function DashboardSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading dashboard">
      <span className="sr-only">Loading dashboard...</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-border h-32">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="bg-white p-6 rounded-xl border border-border h-32">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-2 bg-gray-200 rounded w-full" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="h-5 bg-gray-200 rounded w-1/4" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-6 py-4 flex gap-4 border-b border-border">
            <div className="h-4 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MachinesSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading machines">
      <span className="sr-only">Loading machines...</span>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-6 bg-gray-200 rounded w-16" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-32" />
      </div>
      <div className="bg-white rounded-xl border border-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-6 py-5 flex items-center gap-4 border-b border-border">
            <div className="size-8 bg-gray-200 rounded-lg" />
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="flex gap-2 ml-auto">
              <div className="size-8 bg-gray-200 rounded" />
              <div className="size-8 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading settings">
      <span className="sr-only">Loading settings...</span>
      <div className="bg-white rounded-xl border border-border p-6 max-w-lg space-y-6">
        <div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-11 bg-gray-200 rounded w-full" />
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
          <div className="h-11 bg-gray-200 rounded w-full" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-28" />
      </div>
    </div>
  );
}
