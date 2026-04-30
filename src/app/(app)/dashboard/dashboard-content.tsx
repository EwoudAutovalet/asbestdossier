"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Profile, Property, Job, JobStatus } from "@/lib/types";
import { JOB_STATUS_LABELS } from "@/lib/types";

interface DashboardContentProps {
  profile: Profile;
  jobs: (Job & { property: Property; specialist: Profile | null })[];
  properties: Property[];
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

export function DashboardContent({ profile, jobs, properties }: DashboardContentProps) {
  const router = useRouter();
  const firstName = profile.full_name.split(" ")[0];

  const stats = {
    total: jobs.length,
    active: jobs.filter((j) => j.status === "in_progress").length,
    pending: jobs.filter((j) => ["pending", "inspection", "quoted", "approved"].includes(j.status)).length,
    completed: jobs.filter((j) => j.status === "completed").length,
  };

  const statCards = [
    { label: "Totaal opdrachten", value: stats.total, icon: ClipboardCheck, color: "text-foreground" },
    { label: "Actief", value: stats.active, icon: AlertTriangle, color: "text-purple-600" },
    { label: "In afwachting", value: stats.pending, icon: Clock, color: "text-blue-600" },
    { label: "Afgerond", value: stats.completed, icon: CheckCircle2, color: "text-green-600" },
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
              <div className={`text-3xl font-extrabold font-mono tracking-tight ${s.color}`}>
                {s.value}
              </div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                {s.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
