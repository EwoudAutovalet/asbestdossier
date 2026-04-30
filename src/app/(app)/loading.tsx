export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 bg-muted rounded-md" />
        <div className="h-4 w-32 bg-muted rounded-md mt-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <div className="h-5 w-5 bg-muted rounded mb-3" />
            <div className="h-8 w-20 bg-muted rounded mb-2" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-5 border-b">
          <div className="h-4 w-36 bg-muted rounded" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-3 border-b last:border-b-0">
            <div className="flex-1">
              <div className="h-4 w-48 bg-muted rounded mb-1.5" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
            <div className="h-6 w-20 bg-muted rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
