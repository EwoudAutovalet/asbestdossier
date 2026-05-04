"use client";

import { useRouter } from "next/navigation";
import {
  User,
  UserPlus,
  ImageIcon,
  ScanLine,
  RefreshCw,
  Loader2,
  FileText,
  Plus,
  Store,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuoteForm } from "@/components/quotes/quote-form";
import { QuoteDetail } from "@/components/quotes/quote-detail";
import { ChatPanel } from "@/components/chat/chat-panel";
import type { Job, Profile, Property, Attachment, Removal, QuoteWithLines, JobStatus } from "@/lib/types";
import { JOB_STATUS_LABELS, REMOVAL_METHOD_LABELS } from "@/lib/types";

type JobWithDetails = Job & {
  specialist: Profile | null;
  attachments: Attachment[];
  removals: Removal[];
  quotes: QuoteWithLines[];
};

interface StapVerwijderingProps {
  property: Property;
  jobs: JobWithDetails[];
  profile: Profile;
  specialists: Profile[];
  onCreateJob: () => void;
  onAssignSpecialist: (jobId: string) => void;
  onUpdateJobStatus: (jobId: string, status: JobStatus) => Promise<void>;
  updatingStatus: string | null;
}

const jobStatusFlow: JobStatus[] = [
  "pending",
  "inspection",
  "quoted",
  "approved",
  "in_progress",
  "completed",
];

function getNextStatuses(current: JobStatus): JobStatus[] {
  const idx = jobStatusFlow.indexOf(current);
  if (idx === -1 || current === "completed" || current === "cancelled") return [];
  return jobStatusFlow.slice(idx + 1).concat(["cancelled"]);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StapVerwijdering({
  property,
  jobs,
  profile,
  onCreateJob,
  onAssignSpecialist,
  onUpdateJobStatus,
  updatingStatus,
}: StapVerwijderingProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Action bar */}
      {(profile.role === "owner" || profile.role === "broker") && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onCreateJob}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nieuwe opdracht
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push("/markt/nieuw")}>
            <Store className="w-4 h-4 mr-1.5" />
            Op marktplaats
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push("/planning")}>
            <CalendarDays className="w-4 h-4 mr-1.5" />
            Plan afspraak
          </Button>
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Nog geen opdrachten voor dit pand.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="p-4 rounded-lg border hover:bg-muted/30 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{job.title}</div>
                  {job.specialist ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <User className="w-3 h-3" />
                      {job.specialist.company_name || job.specialist.full_name}
                    </div>
                  ) : profile.role === "owner" ? (
                    <button
                      onClick={() => onAssignSpecialist(job.id)}
                      className="flex items-center gap-1.5 text-xs text-primary mt-1 hover:underline"
                    >
                      <UserPlus className="w-3 h-3" />
                      Specialist toewijzen
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
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
                  >
                    {JOB_STATUS_LABELS[job.status]}
                  </Badge>
                  {job.handling_method && (
                    <Badge
                      variant={job.handling_method === "hermetische_zone" ? "warning" : "info"}
                      className="text-[10px]"
                    >
                      {REMOVAL_METHOD_LABELS[job.handling_method]}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {job.description && (
                <p className="text-xs text-muted-foreground mb-2">{job.description}</p>
              )}

              {/* Stats */}
              <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {job.attachments.filter((a) => a.type === "site_photo").length} foto&apos;s
                </span>
                <span className="flex items-center gap-1">
                  <ScanLine className="w-3 h-3" />
                  {job.attachments.filter((a) => a.type === "paper_scan").length} scans
                </span>
                {job.total_cost && <span>&euro;{job.total_cost.toLocaleString("nl-BE")}</span>}
                <span className="font-mono">{formatDate(job.created_at)}</span>
              </div>

              {/* QuoteForm for specialist */}
              {profile.role === "specialist" && job.specialist_id === profile.id && (
                <div className="mt-3 pt-3 border-t">
                  <QuoteForm
                    jobId={job.id}
                    propertyId={property.id}
                    specialistId={profile.id}
                    existingQuote={job.quotes.length > 0 ? job.quotes[0] : null}
                    onSaved={() => router.refresh()}
                  />
                </div>
              )}

              {/* QuoteDetail for owner/broker */}
              {(profile.role === "owner" || profile.role === "broker") && job.quotes.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <QuoteDetail
                    quote={job.quotes[0]}
                    jobId={job.id}
                    propertyId={property.id}
                    currentUserId={profile.id}
                    onResponded={() => router.refresh()}
                  />
                </div>
              )}

              {/* Chat */}
              {job.specialist_id && <ChatPanel jobId={job.id} currentUser={profile} />}

              {/* Status controls */}
              {(profile.role === "owner" || profile.role === "broker") &&
                getNextStatuses(job.status).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground mr-1 self-center">
                      <RefreshCw className="w-3 h-3 inline mr-1" />
                      Status wijzigen:
                    </span>
                    {getNextStatuses(job.status).map((nextStatus) => (
                      <Button
                        key={nextStatus}
                        variant={nextStatus === "cancelled" ? "destructive" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        disabled={updatingStatus === job.id}
                        onClick={() => onUpdateJobStatus(job.id, nextStatus)}
                      >
                        {updatingStatus === job.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          JOB_STATUS_LABELS[nextStatus]
                        )}
                      </Button>
                    ))}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
