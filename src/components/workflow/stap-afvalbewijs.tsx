"use client";

import { FileText, Plus, Loader2, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RemovalTracker } from "@/components/removals/removal-tracker";
import type { Job, Profile, Attachment, Removal } from "@/lib/types";
import { JOB_STATUS_LABELS } from "@/lib/types";

type JobWithRemovals = Job & { removals: Removal[]; attachments: Attachment[] };

interface StapAfvalbewijsProps {
  jobs: JobWithRemovals[];
  profile: Profile;
  disposalUploadJobId: string | null;
  disposalRef: string;
  disposalFile: File | null;
  uploadingDisposal: boolean;
  onSetDisposalUploadJobId: (jobId: string | null) => void;
  onSetDisposalRef: (ref: string) => void;
  onSetDisposalFile: (file: File | null) => void;
  onUpload: (jobId: string) => Promise<void>;
}

export function StapAfvalbewijs({
  jobs,
  profile,
  disposalUploadJobId,
  disposalRef,
  disposalFile,
  uploadingDisposal,
  onSetDisposalUploadJobId,
  onSetDisposalRef,
  onSetDisposalFile,
  onUpload,
}: StapAfvalbewijsProps) {
  const jobsWithRemovals = jobs.filter((j) => (j.removals || []).length > 0);

  return (
    <div className="space-y-4">
      {/* Legal info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            Conform VLAREMA-regelgeving moet voor elke asbestverwijdering een bewijs van legale afvalverwerking worden
            bewaard. Upload hier het identificatieformulier van de erkende afvalverwerker.
          </p>
        </div>
      </div>

      {/* Empty state */}
      {jobsWithRemovals.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          Nog geen verwijderingen geregistreerd. Registreer verwijderingen in stap 3.
        </div>
      ) : (
        jobsWithRemovals.map((job) => {
          const disposalCerts = job.attachments.filter((a) => a.type === "disposal_certificate");
          const isSpecialistOnJob = profile.role === "specialist" && job.specialist_id === profile.id;

          return (
            <div key={job.id} className="rounded-lg border p-4 space-y-4">
              {/* Job header */}
              <div className="flex items-center justify-between">
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

              {/* Removal tracker */}
              <RemovalTracker jobId={job.id} removals={job.removals} />

              <Separator />

              {/* VLAREMA section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    VLAREMA Afvalcertificaat
                  </span>
                  {isSpecialistOnJob && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        onSetDisposalUploadJobId(disposalUploadJobId === job.id ? null : job.id);
                        onSetDisposalRef("");
                        onSetDisposalFile(null);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Certificaat toevoegen
                    </Button>
                  )}
                </div>

                {/* Existing certs */}
                {disposalCerts.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center gap-2 p-2 rounded border bg-muted/20 mb-1"
                  >
                    <FileText className="w-4 h-4 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{cert.file_name}</div>
                      {cert.disposal_reference && (
                        <div className="text-[10px] text-muted-foreground">Ref: {cert.disposal_reference}</div>
                      )}
                    </div>
                    <Badge variant="success" className="text-[10px] shrink-0">
                      Afvalcertificaat
                    </Badge>
                  </div>
                ))}
                {disposalCerts.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nog geen afvalcertificaat geüpload.</p>
                )}

                {/* Upload form */}
                {disposalUploadJobId === job.id && (
                  <div className="mt-2 p-3 rounded-lg border border-primary/30 bg-primary/[0.02] space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Referentienummer afvalverwerker</Label>
                      <Input
                        placeholder="Bijv. VLAREMA-2024-001"
                        value={disposalRef}
                        onChange={(e) => onSetDisposalRef(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Certificaat (PDF of afbeelding){" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="text-xs w-full"
                        onChange={(e) => onSetDisposalFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      disabled={!disposalFile || uploadingDisposal}
                      onClick={() => onUpload(job.id)}
                    >
                      {uploadingDisposal ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Uploaden...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Certificaat uploaden
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
