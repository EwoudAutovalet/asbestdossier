"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Euro,
  FileText,
  Activity,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Profile, Property, Job, JobStatus, TimelineEvent, Quote } from "@/lib/types";
import { JOB_STATUS_LABELS, QUOTE_STATUS_LABELS } from "@/lib/types";

interface DashboardContentProps {
  profile: Profile;
  jobs: (Job & { property: Property; specialist: Profile | null })[];
  properties: Property[];
  timeline: (TimelineEvent & { actor: Profile })[];
  pendingQuotes: (Quote & { job: Job & { property: Property } })[];
}

const statusVariant: Record<JobStatus, "warning" | "info" | "purple" | "success" | "secondary" | "destructive"> = {
  pending: "warning",
  inspection: "info",
  quoted: "info",
  approved: "info",
  in_progress: "purple",
  completed: "success",
  cancelled: "destructive",
};

function jobProgress(status: JobStatus): number {
  const map: Record<JobStatus, number> = {
    pending: 10,
    inspection: 25,
    quoted: 40,
    approved: 50,
    in_progress: 70,
    completed: 100,
    cancelled: 0,
  };
  return map[status];
}

function timeAgo(dateStr: string) {
  const now = new Date().getTime();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "Zojuist";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}u`;
  return `${Math.floor(diff / 86400)}d`;
}

export function DashboardContent({ profile, jobs, properties, timeline, pendingQuotes }: DashboardContentProps) {
  const router = useRouter();
  const firstName = profile.full_name.split(" ")[0];

  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === "in_progress").length,
    pending: jobs.filter((j) => ["pending", "inspection", "quoted", "approved"].includes(j.status)).length,
    completed: jobs.filter((j) => j.status === "completed").length,
  };

  const totalCost = jobs.reduce((sum, j) => sum + (j.total_cost || 0), 0);

  const statCards = [
    { label: "Totaal opdrachten", value: String(stats.total), icon: ClipboardCheck, color: "text-foreground" },
    { label: "Actief", value: String(stats.active), icon: AlertTriangle, color: "text-purple-600" },
    { label: "In afwachting", value: String(stats.pending), icon: Clock, color: "text-blue-600" },
    ...(profile.role === "owner"
      ? [{ label: "Totale kosten", value: `€${totalCost.toLocaleString("nl-BE")}`, icon: Euro, color: "text-green-600" }]
      : [{ label: "Afgerond", value: String(stats.completed), icon: CheckCircle2, color: "text-green-600" }]),
  ];

  const needsAction = profile.role === "owner"
    ? [
        ...pendingQuotes.map((q) => ({
          id: q.id,
          label: `Offerte beoordelen: €${q.total_cost.toLocaleString("nl-BE")}`,
          sub: q.job?.property?.address || "",
          link: `/dossiers/${q.job?.property_id}`,
          badge: "Offerte",
          variant: "info" as const,
        })),
        ...jobs
          .filter((j) => j.status === "pending" && !j.specialist_id)
          .map((j) => ({
            id: j.id,
            label: `Specialist toewijzen: ${j.title}`,
            sub: j.property?.address || "",
            link: `/dossiers/${j.property_id}`,
            badge: "Toewijzen",
            variant: "warning" as const,
          })),
      ]
    : [
        ...jobs
          .filter((j) => j.status === "inspection")
          .map((j) => ({
            id: j.id,
            label: `Inspectie uitvoeren: ${j.title}`,
            sub: j.property?.address || "",
            link: `/dossiers/${j.property_id}`,
            badge: "Inspectie",
            variant: "info" as const,
          })),
        ...jobs
          .filter((j) => j.status === "approved")
          .map((j) => ({
            id: j.id,
            label: `Werk starten: ${j.title}`,
            sub: j.property?.address || "",
            link: `/dossiers/${j.property_id}`,
            badge: "Goedgekeurd",
            variant: "success" as const,
          })),
        ...pendingQuotes
          .filter((q) => q.status === "draft")
          .map((q) => ({
            id: q.id,
            label: `Offerte afronden`,
            sub: q.job?.property?.address || "",
            link: `/dossiers/${q.job?.property_id}`,
            badge: "Concept",
            variant: "warning" as const,
          })),
      ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Overzicht</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welkom terug, {firstName}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className={`text-2xl font-extrabold font-mono tracking-tight ${s.color}`}>
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                {s.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Pending actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Openstaande acties
            </CardTitle>
            {needsAction.length > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {needsAction.length}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {needsAction.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Alles is bijgewerkt!
              </div>
            ) : (
              needsAction.slice(0, 5).map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-3 px-5 py-3 border-t cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => router.push(action.link)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{action.label}</div>
                    <div className="text-xs text-muted-foreground">{action.sub}</div>
                  </div>
                  <Badge variant={action.variant} className="text-[10px] shrink-0">
                    {action.badge}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent activity timeline */}
        {profile.role === "owner" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Recente activiteit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {timeline.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Nog geen activiteit.
                </div>
              ) : (
                timeline.slice(0, 6).map((event) => (
                  <div key={event.id} className="flex gap-3 px-5 py-2.5 border-t">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <span className="font-semibold">{event.actor.full_name}</span>
                        <span className="text-muted-foreground"> — {event.action}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {timeAgo(event.created_at)} geleden
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Specialist: quote overview */}
        {profile.role === "specialist" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Mijn offertes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingQuotes.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Geen openstaande offertes.
                </div>
              ) : (
                pendingQuotes.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-3 px-5 py-3 border-t cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/dossiers/${q.job?.property_id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate font-mono">
                        €{q.total_cost.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {q.job?.property?.address || ""}
                      </div>
                    </div>
                    <Badge
                      variant={
                        q.status === "approved" ? "success" :
                        q.status === "rejected" ? "destructive" :
                        q.status === "submitted" ? "info" : "warning"
                      }
                      className="text-[10px]"
                    >
                      {QUOTE_STATUS_LABELS[q.status]}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Properties (owner) */}
      {profile.role === "owner" && properties.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold">Mijn panden</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push("/dossiers")}>
              Bekijk alle <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {properties.slice(0, 5).map((prop) => (
              <div
                key={prop.id}
                className="flex items-center gap-4 px-6 py-3 border-t cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/dossiers/${prop.id}`)}
              >
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{prop.address}</div>
                  <div className="text-xs text-muted-foreground">
                    {prop.postal_code} {prop.city}
                  </div>
                </div>
                <Badge variant={
                  prop.status === "cleared" ? "success" :
                  prop.status === "remediation" ? "purple" :
                  prop.status === "inspection" ? "info" : "warning"
                }>
                  {prop.status === "new" ? "Nieuw" :
                   prop.status === "inspection" ? "Inspectie" :
                   prop.status === "remediation" ? "Verwijdering" : "Afgerond"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-bold">Recente opdrachten</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push("/dossiers")}>
            Bekijk alle <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nog geen opdrachten gevonden.
            </div>
          ) : (
            jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-4 px-6 py-3 border-t cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/dossiers/${job.property_id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{job.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {job.property?.address}, {job.property?.postal_code} {job.property?.city}
                  </div>
                </div>
                <Badge variant={statusVariant[job.status]}>
                  {JOB_STATUS_LABELS[job.status]}
                </Badge>
                <div className="w-24 hidden md:block">
                  <Progress value={jobProgress(job.status)} className="h-1.5" />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {jobProgress(job.status)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
