export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 bg-muted rounded-md" />
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-40 bg-muted rounded" />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div>
            <div className="h-3 w-32 bg-muted rounded mb-3" />
            <div className="h-6 w-64 bg-muted rounded mb-4" />
            <div className="flex gap-6">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-4 w-28 bg-muted rounded" />
            </div>
          </div>
          <div className="text-right">
            <div className="h-6 w-24 bg-muted rounded-md mb-3 ml-auto" />
            <div className="h-2 w-44 bg-muted rounded ml-auto" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-muted rounded-lg" />
              <div>
                <div className="h-5 w-8 bg-muted rounded mb-1" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-4">
          <div className="h-9 w-full bg-muted rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border-t">
            <div className="h-4 w-48 bg-muted rounded mb-2" />
            <div className="h-3 w-32 bg-muted rounded mb-3" />
            <div className="flex gap-3">
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
