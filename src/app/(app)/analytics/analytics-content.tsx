"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Euro,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Property, PropertyStatus } from "@/lib/types";
import { PROPERTY_STATUS_LABELS, JOB_STATUS_LABELS } from "@/lib/types";

interface AnalyticsContentProps {
  monthlyCosts: { created_at: string; total_cost: number | null; status: string }[];
  allJobs: { status: string }[];
  removals: { component_name: string }[];
  completedJobs: { started_at: string; completed_at: string }[];
  properties: (Property & { jobs: { total_cost: number | null }[] })[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  inspection: "#3b82f6",
  quoted: "#6366f1",
  approved: "#8b5cf6",
  in_progress: "#a855f7",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

export function AnalyticsContent({
  monthlyCosts,
  allJobs,
  removals,
  completedJobs,
  properties,
}: AnalyticsContentProps) {
  // Monthly cost aggregation
  const monthlyMap = new Map<string, number>();
  monthlyCosts.forEach((j) => {
    const month = new Date(j.created_at).toLocaleDateString("nl-BE", {
      month: "short",
      year: "numeric",
    });
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + (j.total_cost || 0));
  });
  const monthlyData = Array.from(monthlyMap.entries())
    .map(([month, cost]) => ({ month, cost }))
    .slice(-12);

  // Jobs by status
  const statusMap = new Map<string, number>();
  allJobs.forEach((j) => {
    statusMap.set(j.status, (statusMap.get(j.status) || 0) + 1);
  });
  const statusData = Array.from(statusMap.entries()).map(([status, count]) => ({
    name: JOB_STATUS_LABELS[status as keyof typeof JOB_STATUS_LABELS] || status,
    value: count,
    color: STATUS_COLORS[status] || "#94a3b8",
  }));

  // Removals by component
  const removalMap = new Map<string, number>();
  removals.forEach((r) => {
    removalMap.set(r.component_name, (removalMap.get(r.component_name) || 0) + 1);
  });
  const removalData = Array.from(removalMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Average lead time
  let avgLeadTimeDays = 0;
  if (completedJobs.length > 0) {
    const totalDays = completedJobs.reduce((sum, j) => {
      const start = new Date(j.started_at).getTime();
      const end = new Date(j.completed_at).getTime();
      return sum + (end - start) / (1000 * 60 * 60 * 24);
    }, 0);
    avgLeadTimeDays = Math.round(totalDays / completedJobs.length);
  }

  // Cost per property
  const propertyData = properties.map((p) => ({
    ...p,
    totalCost: p.jobs.reduce((sum, j) => sum + (j.total_cost || 0), 0),
    jobCount: p.jobs.length,
  }));

  const totalCost = propertyData.reduce((sum, p) => sum + p.totalCost, 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Inzichten en statistieken over je asbestdossiers
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Euro className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight">
              &euro;{totalCost.toLocaleString("nl-BE")}
            </div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Totale kosten
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight">
              {allJobs.length}
            </div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Totaal opdrachten
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight">
              {avgLeadTimeDays > 0 ? `${avgLeadTimeDays}d` : "-"}
            </div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Gem. doorlooptijd
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight">
              {properties.length}
            </div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Panden
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Monthly costs bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Kosten per maand</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Nog geen kostendata beschikbaar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip
                    formatter={(value) => [`€${Number(value).toLocaleString("nl-BE")}`, "Kosten"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Jobs by status pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Opdrachten per status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Nog geen opdrachten beschikbaar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Removals chart + cost per property */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Removals by material */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Verwijderingen per materiaaltype</CardTitle>
          </CardHeader>
          <CardContent>
            {removalData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Nog geen verwijderingen geregistreerd.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={removalData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Aantal" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost per property table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Kosten per pand</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {propertyData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Nog geen panden beschikbaar.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_80px_100px_100px] gap-2 px-4 py-2 bg-muted/50 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Adres</span>
                  <span>Jobs</span>
                  <span>Totaal</span>
                  <span>Status</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {propertyData.map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-[1fr_80px_100px_100px] gap-2 px-4 py-2.5 border-b last:border-b-0 text-sm items-center"
                    >
                      <div className="truncate font-medium">{p.address}</div>
                      <div className="font-mono text-muted-foreground">{p.jobCount}</div>
                      <div className="font-mono font-semibold">
                        &euro;{p.totalCost.toLocaleString("nl-BE")}
                      </div>
                      <Badge
                        variant={
                          p.status === "cleared"
                            ? "success"
                            : p.status === "remediation"
                            ? "purple"
                            : p.status === "inspection"
                            ? "info"
                            : "warning"
                        }
                        className="text-[10px]"
                      >
                        {PROPERTY_STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
