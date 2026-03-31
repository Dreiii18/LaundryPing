export default function AdminPlansLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>

      {/* Credit management cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="flex gap-2 pt-1">
              <div className="h-8 bg-gray-200 rounded w-20" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Package selector row */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-40" />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg flex-1" />
          ))}
        </div>
      </div>
    </div>
  );
}
