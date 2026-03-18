export default function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-24 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-56 bg-slate-100 rounded" />
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="h-5 w-36 bg-slate-200 rounded" />
        </div>
        <div className="p-6 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          ))}
          <div className="h-10 w-24 bg-slate-200 rounded-lg mt-2" />
        </div>
      </div>
    </div>
  );
}
