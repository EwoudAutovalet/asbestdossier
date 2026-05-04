import { Card, CardContent } from "@/components/ui/card";

export default function PlanningLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-muted rounded w-40 mb-2" />
      <div className="h-4 bg-muted rounded w-64 mb-6" />
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
