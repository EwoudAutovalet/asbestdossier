"use client";

import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Property } from "@/lib/types";

interface StapAsbestveiligProps {
  property: Property;
  hasIssuedCertificate: boolean;
  allJobsCompleted: boolean;
  allRemovalsPhotographed: boolean;
  hasDisposalProofForAllJobs: boolean;
  onMarkAsbestveilig: () => Promise<void>;
  markingCleared: boolean;
}

export function StapAsbestveilig({
  property,
  hasIssuedCertificate,
  allJobsCompleted,
  allRemovalsPhotographed,
  hasDisposalProofForAllJobs,
  onMarkAsbestveilig,
  markingCleared,
}: StapAsbestveiligProps) {
  if (property.status === "cleared") {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="font-extrabold text-lg mb-1">Dit pand is officieel Asbestveilig verklaard</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {new Date(property.updated_at).toLocaleDateString("nl-BE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <Badge variant="success">Asbestveilig</Badge>
      </div>
    );
  }

  const checks = [
    { label: "Geldig AIA-attest aanwezig", value: hasIssuedCertificate },
    { label: "Alle verwijderingen gefotografeerd", value: allRemovalsPhotographed },
    { label: "VLAREMA afvalcertificaat per opdracht", value: hasDisposalProofForAllJobs },
    { label: "Alle opdrachten afgerond", value: allJobsCompleted },
  ];

  const allPassed = checks.every((c) => c.value);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-3 p-3 rounded-lg border">
            {check.value ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            )}
            <span className="text-sm flex-1">{check.label}</span>
            {!check.value && (
              <Badge variant="destructive" className="text-[10px]">
                Ontbreekt
              </Badge>
            )}
          </div>
        ))}
      </div>

      <Button
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        disabled={!allPassed || markingCleared}
        title={!allPassed ? "Voldoe eerst aan alle vereisten" : undefined}
        onClick={onMarkAsbestveilig}
      >
        {markingCleared ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Bezig...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Markeer als Asbestveilig
          </>
        )}
      </Button>
    </div>
  );
}
