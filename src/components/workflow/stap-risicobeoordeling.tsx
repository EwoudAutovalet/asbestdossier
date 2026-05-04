"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InspectionChecklistComponent } from "@/components/inspection/inspection-checklist";
import type { Job, Profile, InspectionChecklist, ChecklistItem } from "@/lib/types";
import type { CalculatedRisk, ConditionScore, CoverageLevel, ExposureType } from "@/lib/types";
import { JOB_STATUS_LABELS, CALCULATED_RISK_LABELS } from "@/lib/types";
import { calculateRisk } from "@/lib/risk-calculator";

interface StapRisicobeoordelingProps {
  jobs: (Job & { specialist: Profile | null; checklists: (InspectionChecklist & { items: ChecklistItem[] })[] })[];
  role: "owner" | "specialist" | "broker";
}

function RiskProfile({ checklists }: { checklists: (InspectionChecklist & { items: ChecklistItem[] })[] }) {
  const allItems = checklists.flatMap((cl) => cl.items);

  if (allItems.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg mb-4">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Nog geen inspectie-items beschikbaar. Voer eerst een IP2-inspectie uit.
      </div>
    );
  }

  const itemsWithRisk = allItems.map((item) => {
    const risk =
      (item.calculated_risk as CalculatedRisk) ||
      calculateRisk({
        is_hechtgebonden: item.is_hechtgebonden ?? null,
        condition_score: (item.condition_score as ConditionScore | null) ?? null,
        exposure: (item.exposure as ExposureType | null) ?? null,
        coverage: (item.coverage as CoverageLevel | null) ?? null,
      });
    return { ...item, risk };
  });

  const riskCounts: Record<CalculatedRisk, number> = { zeer_laag: 0, laag: 0, verhoogd: 0, hoog: 0 };
  itemsWithRisk.forEach((i) => { riskCounts[i.risk]++; });
  const total = itemsWithRisk.length;
  const hechtCount = itemsWithRisk.filter((i) => i.is_hechtgebonden === true).length;
  const losCount = itemsWithRisk.filter((i) => i.is_hechtgebonden === false).length;
  const highestRiskItem =
    itemsWithRisk.find((i) => i.risk === "hoog") || itemsWithRisk.find((i) => i.risk === "verhoogd");

  let overallBadge: { label: string; variant: "success" | "warning" | "destructive" } = {
    label: "Laag risico",
    variant: "success",
  };
  if (riskCounts.hoog > 0) overallBadge = { label: "Hoog risico — actie vereist", variant: "destructive" };
  else if (riskCounts.verhoogd > 0) overallBadge = { label: "Verhoogd risico", variant: "warning" };

  const barSegments = [
    { key: "zeer_laag", pct: (riskCounts.zeer_laag / total) * 100, color: "bg-green-500" },
    { key: "laag", pct: (riskCounts.laag / total) * 100, color: "bg-blue-500" },
    { key: "verhoogd", pct: (riskCounts.verhoogd / total) * 100, color: "bg-orange-500" },
    { key: "hoog", pct: (riskCounts.hoog / total) * 100, color: "bg-red-500" },
  ];

  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Risicoprofiel</span>
          </div>
          <Badge variant={overallBadge.variant}>{overallBadge.label}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold font-mono">{total}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Materialen</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono">{hechtCount}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Hechtgebonden</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono">{losCount}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Losgebonden</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Risicoverdeling</div>
          <div className="h-3 rounded-full overflow-hidden flex bg-muted">
            {barSegments
              .filter((s) => s.pct > 0)
              .map((s) => (
                <div key={s.key} className={`${s.color} h-full`} style={{ width: `${s.pct}%` }} />
              ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {barSegments
              .filter((s) => s.pct > 0)
              .map((s) => (
                <span key={s.key}>
                  {CALCULATED_RISK_LABELS[s.key as CalculatedRisk]} ({Math.round(s.pct)}%)
                </span>
              ))}
          </div>
        </div>

        {highestRiskItem && (
          <div className="p-2 rounded border border-red-200 bg-red-50/50 flex items-center gap-2">
            <Badge variant="destructive" className="text-[10px] shrink-0">
              {CALCULATED_RISK_LABELS[highestRiskItem.risk]}
            </Badge>
            <span className="text-xs truncate">
              {highestRiskItem.location_description || highestRiskItem.category} — {highestRiskItem.item_name}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StapRisicobeoordeling({ jobs }: StapRisicobeoordelingProps) {
  const allChecklists = jobs.flatMap((j) => j.checklists || []);

  return (
    <div className="space-y-4">
      <RiskProfile checklists={allChecklists} />
      {jobs.map((job) => (
        <div key={job.id}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">{job.title}</span>
            <Badge
              variant={
                job.status === "completed"
                  ? "success"
                  : job.status === "in_progress"
                  ? "purple"
                  : job.status === "cancelled"
                  ? "destructive"
                  : "info"
              }
              className="text-[10px]"
            >
              {JOB_STATUS_LABELS[job.status]}
            </Badge>
          </div>
          <InspectionChecklistComponent jobId={job.id} checklists={job.checklists || []} />
        </div>
      ))}
    </div>
  );
}
