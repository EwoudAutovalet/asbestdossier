"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Calendar,
  AlertTriangle,
  FileText,
  ImageIcon,
  Clock,
  CheckCircle2,
  Camera,
  ScanLine,
  Package,
  Plus,
  Loader2,
  UserPlus,
  RefreshCw,
  ClipboardCheck,
  FileDown,
  Shield,
  CalendarDays,
  Landmark,
  Info,
  Store,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  Profile,
  Property,
  Job,
  Attachment,
  Removal,
  TimelineEvent,
  InspectionChecklist,
  ChecklistItem,
  PropertyStatus,
  JobStatus,
  QuoteWithLines,
  InventoryCertificate,
  CertificateItem,
} from "@/lib/types";
import { PROPERTY_STATUS_LABELS, JOB_STATUS_LABELS, RISK_LEVEL_LABELS, CONDITION_LABELS, PRIORITY_LABELS, CERTIFICATE_STATUS_LABELS, RECOMMENDED_ACTION_LABELS, REMOVAL_METHOD_LABELS } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { QuoteForm } from "@/components/quotes/quote-form";
import { QuoteDetail } from "@/components/quotes/quote-detail";
import { ChatPanel } from "@/components/chat/chat-panel";
import { downloadAsbestReport } from "@/components/pdf/asbestos-report";
import { notify, addTimelineEvent } from "@/lib/notifications";
import type { GebouwDetails, CalculatedRisk, ConditionScore, CoverageLevel, ExposureType } from "@/lib/types";
import { CALCULATED_RISK_LABELS } from "@/lib/types";
import { calculateRisk, RISK_BADGE_VARIANT } from "@/lib/risk-calculator";
import { WorkflowStepper, type WorkflowStep } from "@/components/workflow/workflow-stepper";
import { ContextActieBlok } from "@/components/workflow/context-actie-blok";
import { StapInventaris } from "@/components/workflow/stap-inventaris";
import { StapRisicobeoordeling } from "@/components/workflow/stap-risicobeoordeling";
import { StapVerwijdering } from "@/components/workflow/stap-verwijdering";
import { StapAfvalbewijs } from "@/components/workflow/stap-afvalbewijs";
import { StapAsbestveilig } from "@/components/workflow/stap-asbestveilig";
import { ActivityLogPanel } from "@/components/layout/activity-log-panel";
import { DocumentArchief } from "@/components/documents/document-archief";

interface PropertyDetailProps {
  profile: Profile;
  property: Property;
  owner: Profile | null;
  jobs: (Job & { specialist: Profile | null; attachments: Attachment[]; removals: Removal[]; checklists: (InspectionChecklist & { items: ChecklistItem[] })[]; quotes: QuoteWithLines[] })[];
  timeline: (TimelineEvent & { actor: Profile })[];
  specialists: Profile[];
  certificates?: (InventoryCertificate & { items: CertificateItem[] })[];
}

const statusVariant: Record<PropertyStatus, "warning" | "info" | "purple" | "success"> = {
  new: "warning",
  inspection: "info",
  remediation: "purple",
  cleared: "success",
};

function propertyProgress(status: PropertyStatus): number {
  const map: Record<PropertyStatus, number> = {
    new: 10,
    inspection: 35,
    remediation: 65,
    cleared: 100,
  };
  return map[status];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PropertyDetail({
  profile,
  property,
  owner,
  jobs,
  timeline,
  specialists,
  certificates = [],
}: PropertyDetailProps) {
  const router = useRouter();
  const supabase = createClient();

  const [showCreateJob, setShowCreateJob] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobError, setJobError] = useState("");

  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [assigningSpec, setAssigningSpec] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const [disposalUploadJobId, setDisposalUploadJobId] = useState<string | null>(null);
  const [disposalRef, setDisposalRef] = useState("");
  const [disposalFile, setDisposalFile] = useState<File | null>(null);
  const [uploadingDisposal, setUploadingDisposal] = useState(false);

  const searchParams = useSearchParams();
  const stapParam = searchParams.get("stap");
  const [activeStep, setActiveStep] = useState<number>(stapParam ? parseInt(stapParam) : 1);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [markingCleared, setMarkingCleared] = useState(false);

  const allAttachments = jobs.flatMap((j) => j.attachments);
  const sitePhotos = allAttachments.filter((a) => a.type === "site_photo");
  const paperScans = allAttachments.filter((a) => a.type === "paper_scan");
  const allRemovals = jobs.flatMap((j) => j.removals || []);
  const allChecklists = jobs.flatMap((j) => j.checklists || []);
  const progress = propertyProgress(property.status);

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (!jobTitle.trim()) return;
    setSavingJob(true);
    setJobError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { error: insertError } = await supabase.from("jobs").insert({
        property_id: property.id,
        title: jobTitle.trim(),
        description: jobDescription.trim() || null,
        status: "pending",
      });

      if (insertError) throw insertError;

      await supabase.from("timeline_events").insert({
        property_id: property.id,
        actor_id: user.id,
        action: `Nieuwe opdracht aangemaakt: ${jobTitle.trim()}`,
        details: { title: jobTitle.trim() },
      });

      setJobTitle("");
      setJobDescription("");
      setShowCreateJob(false);
      router.refresh();
    } catch (err: unknown) {
      setJobError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setSavingJob(false);
    }
  }

  async function handleAssignSpecialist(jobId: string, specialistId: string) {
    setAssigningSpec(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const specialist = specialists.find((s) => s.id === specialistId);

      const { error: updateError } = await supabase
        .from("jobs")
        .update({ specialist_id: specialistId })
        .eq("id", jobId);

      if (updateError) throw updateError;

      await addTimelineEvent({
        supabase,
        propertyId: property.id,
        jobId,
        actorId: user.id,
        action: `Specialist toegewezen: ${specialist?.company_name || specialist?.full_name || "Onbekend"}`,
        details: { specialist_id: specialistId },
      });

      await notify({
        supabase,
        userId: specialistId,
        type: "specialist_assigned",
        title: "Nieuwe opdracht toegewezen",
        body: `Je bent toegewezen aan een opdracht op ${property.address}, ${property.city}`,
        link: `/dossiers/${property.id}`,
        metadata: { job_id: jobId, property_id: property.id },
      });

      setShowAssign(null);
      router.refresh();
    } catch (err) {
      console.error("Assign failed:", err);
    } finally {
      setAssigningSpec(false);
    }
  }

  async function handleUpdateJobStatus(jobId: string, newStatus: JobStatus) {
    setUpdatingStatus(jobId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === "in_progress") updates.started_at = new Date().toISOString();
      if (newStatus === "completed") updates.completed_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", jobId);

      if (updateError) throw updateError;

      await supabase.from("timeline_events").insert({
        property_id: property.id,
        job_id: jobId,
        actor_id: user.id,
        action: `Opdrachtstatus gewijzigd naar: ${JOB_STATUS_LABELS[newStatus]}`,
        details: { new_status: newStatus },
      });

      // Auto-update property status
      if (newStatus === "in_progress") {
        await supabase
          .from("properties")
          .update({ status: "remediation" })
          .eq("id", property.id);
      } else if (newStatus === "completed") {
        const { data: remainingJobs } = await supabase
          .from("jobs")
          .select("status")
          .eq("property_id", property.id)
          .neq("id", jobId)
          .neq("status", "completed")
          .neq("status", "cancelled");

        if (!remainingJobs || remainingJobs.length === 0) {
          // GAP 3: prerequisite checks before marking property as cleared

          // 1. At least one issued OVAM inventory certificate
          const { data: issuedCerts } = await supabase
            .from("inventory_certificates")
            .select("id")
            .eq("property_id", property.id)
            .eq("status", "issued")
            .limit(1);

          if (!issuedCerts || issuedCerts.length === 0) {
            toast({
              title: "Pand kan niet worden afgesloten",
              description: "Er is nog geen uitgegeven asbestattest (OVAM) voor dit pand. Maak eerst een attest op.",
              variant: "destructive",
            });
            return;
          }

          // 2. Every completed job with removals needs a disposal certificate (VLAREMA)
          const completedJobIds = jobs
            .filter((j) => (j.status === "completed" || j.id === jobId) && (j.removals || []).length > 0)
            .map((j) => j.id);

          if (completedJobIds.length > 0) {
            const { data: certAttachments } = await supabase
              .from("attachments")
              .select("job_id")
              .in("job_id", completedJobIds)
              .eq("type", "disposal_certificate");

            const coveredIds = new Set((certAttachments || []).map((a) => a.job_id));
            const missing = completedJobIds.filter((id) => !coveredIds.has(id));

            if (missing.length > 0) {
              toast({
                title: "Pand kan niet worden afgesloten",
                description: `Er ontbreekt een bewijs van afvalverwerking (VLAREMA) voor ${missing.length} opdracht${missing.length > 1 ? "en" : ""} met verwijderingen.`,
                variant: "destructive",
              });
              return;
            }
          }

          await supabase
            .from("properties")
            .update({ status: "cleared" })
            .eq("id", property.id);
        }
      } else if (newStatus === "inspection") {
        await supabase
          .from("properties")
          .update({ status: "inspection" })
          .eq("id", property.id);
      }

      router.refresh();
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleDisposalUpload(jobId: string) {
    if (!disposalFile) return;
    setUploadingDisposal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const timestamp = Date.now();
      const sanitized = disposalFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `${jobId}/disposal/${timestamp}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from("property-media")
        .upload(path, disposalFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("property-media").getPublicUrl(path);

      const { error: dbError } = await supabase.from("attachments").insert({
        job_id: jobId,
        uploaded_by: user.id,
        file_url: urlData.publicUrl,
        file_name: disposalFile.name,
        file_size: disposalFile.size,
        mime_type: disposalFile.type,
        type: "disposal_certificate",
        description: null,
        disposal_reference: disposalRef.trim() || null,
        metadata: {},
      });
      if (dbError) throw dbError;

      setDisposalUploadJobId(null);
      setDisposalRef("");
      setDisposalFile(null);
      router.refresh();
    } catch (err) {
      console.error("Disposal cert upload failed:", err);
    } finally {
      setUploadingDisposal(false);
    }
  }

  const jobStatusFlow: JobStatus[] = [
    "pending", "inspection", "quoted", "approved", "in_progress", "completed",
  ];

  function getNextStatuses(current: JobStatus): JobStatus[] {
    const idx = jobStatusFlow.indexOf(current);
    if (idx === -1 || current === "completed" || current === "cancelled") return [];
    return jobStatusFlow.slice(idx + 1).concat(["cancelled"]);
  }

  // Step status calculations
  const hasIssuedCertificate = certificates.some((c) => c.status === "issued");
  const hasCompletedInspection = allChecklists.some((c) => c.completed === true);
  const hasActiveJob = jobs.some((j) => ["in_progress", "completed"].includes(j.status));
  const allJobsCompleted =
    jobs.length > 0 && jobs.every((j) => j.status === "completed" || j.status === "cancelled");
  const jobsWithRemovals = jobs.filter((j) => (j.removals || []).length > 0);
  const hasDisposalProofForAllJobs =
    jobsWithRemovals.length === 0 ||
    jobsWithRemovals.every((j) => j.attachments.some((a) => a.type === "disposal_certificate"));
  const allRemovalsPhotographed =
    allRemovals.length === 0 || allRemovals.every((r) => !!r.photo_url);

  const stepStatuses: Record<number, WorkflowStep["status"]> = {
    1: hasIssuedCertificate ? "completed" : activeStep === 1 ? "active" : "pending",
    2: hasCompletedInspection
      ? "completed"
      : !hasIssuedCertificate
      ? "blocked"
      : activeStep === 2
      ? "active"
      : "pending",
    3: allJobsCompleted
      ? "completed"
      : !hasCompletedInspection
      ? "blocked"
      : activeStep === 3
      ? "active"
      : "pending",
    4:
      hasDisposalProofForAllJobs && jobsWithRemovals.length > 0
        ? "completed"
        : !hasActiveJob
        ? "blocked"
        : activeStep === 4
        ? "active"
        : "pending",
    5: property.status === "cleared"
      ? "completed"
      : !hasDisposalProofForAllJobs
      ? "blocked"
      : activeStep === 5
      ? "active"
      : "pending",
  };

  const workflowSteps: WorkflowStep[] = [
    { id: 1, label: "Inventaris", sublabel: "AIA-attest", status: stepStatuses[1] },
    { id: 2, label: "Risicobeoordeling", sublabel: "IP2 Inspectie", status: stepStatuses[2] },
    { id: 3, label: "Verwijdering", sublabel: "Strategie & Opdrachten", status: stepStatuses[3] },
    { id: 4, label: "Afvalbewijs", sublabel: "VLAREMA Certificaat", status: stepStatuses[4] },
    { id: 5, label: "Asbestveilig", sublabel: "Dossierafsluiting", status: stepStatuses[5] },
  ];

  function handleStepClick(stepId: number) {
    setActiveStep(stepId);
    router.replace(`/dossiers/${property.id}?stap=${stepId}`, { scroll: false });
  }

  async function handleMarkAsbestveilig() {
    setMarkingCleared(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");
      await supabase.from("properties").update({ status: "cleared" }).eq("id", property.id);
      await supabase.from("timeline_events").insert({
        property_id: property.id,
        actor_id: user.id,
        action: "Pand officieel Asbestveilig verklaard",
        details: { cleared_at: new Date().toISOString() },
      });
      router.refresh();
    } catch (err) {
      console.error("Mark cleared failed:", err);
    } finally {
      setMarkingCleared(false);
    }
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dossiers")}
          className="text-primary"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Dossiers
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground font-mono text-xs">
          {property.address}
        </span>
      </div>

      {/* Property Header */}
      <Card className="mb-5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="w-3.5 h-3.5" />
                Aangemeld op {formatDate(property.created_at)}
              </div>
              <h1 className="text-xl font-extrabold tracking-tight mb-3">
                {property.address}, {property.postal_code} {property.city}
              </h1>
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                {owner && (
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Eigenaar
                    </div>
                    <div className="text-sm font-semibold mt-0.5">{owner.full_name}</div>
                  </div>
                )}
                {jobs.length > 0 && jobs[0].specialist && (
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Specialist
                    </div>
                    <div className="text-sm font-semibold mt-0.5">
                      {jobs[0].specialist.company_name || jobs[0].specialist.full_name}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <Badge variant={statusVariant[property.status]} className="mb-3">
                {PROPERTY_STATUS_LABELS[property.status]}
              </Badge>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    downloadAsbestReport({ property, owner, jobs })
                  }
                >
                  <FileDown className="w-3.5 h-3.5 mr-1.5" />
                  PDF Rapport
                </Button>
                {profile.role === "specialist" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => router.push(`/dossiers/${property.id}/attest`)}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
                    AIA Attest
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gebouwgegevens */}
      <GebouwgegevensCard property={property} />

      {/* Context actie blok */}
      <ContextActieBlok
        role={profile.role}
        hasIssuedCertificate={hasIssuedCertificate}
        hasCompletedInspection={hasCompletedInspection}
        hasActiveJob={hasActiveJob}
        hasDisposalProofForAllJobs={hasDisposalProofForAllJobs}
        isCleared={property.status === "cleared"}
        className="mb-5"
      />

      {/* Workflow stepper */}
      <div className="mb-5">
        <WorkflowStepper
          steps={workflowSteps}
          activeStep={activeStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Active step content */}
      <Card>
        <CardContent className="p-5">
          {activeStep === 1 && (
            <StapInventaris
              property={property}
              certificates={certificates}
              role={profile.role}
              onNavigateToAttest={() => router.push(`/dossiers/${property.id}/attest`)}
            />
          )}
          {activeStep === 2 && (
            <StapRisicobeoordeling jobs={jobs} role={profile.role} />
          )}
          {activeStep === 3 && (
            <StapVerwijdering
              property={property}
              jobs={jobs}
              profile={profile}
              specialists={specialists}
              onCreateJob={() => setShowCreateJob(true)}
              onAssignSpecialist={(jobId) => setShowAssign(jobId)}
              onUpdateJobStatus={handleUpdateJobStatus}
              updatingStatus={updatingStatus}
            />
          )}
          {activeStep === 4 && (
            <StapAfvalbewijs
              jobs={jobs}
              profile={profile}
              disposalUploadJobId={disposalUploadJobId}
              disposalRef={disposalRef}
              disposalFile={disposalFile}
              uploadingDisposal={uploadingDisposal}
              onSetDisposalUploadJobId={setDisposalUploadJobId}
              onSetDisposalRef={setDisposalRef}
              onSetDisposalFile={setDisposalFile}
              onUpload={handleDisposalUpload}
            />
          )}
          {activeStep === 5 && (
            <StapAsbestveilig
              property={property}
              hasIssuedCertificate={hasIssuedCertificate}
              allJobsCompleted={allJobsCompleted}
              allRemovalsPhotographed={allRemovalsPhotographed}
              hasDisposalProofForAllJobs={hasDisposalProofForAllJobs}
              onMarkAsbestveilig={handleMarkAsbestveilig}
              markingCleared={markingCleared}
            />
          )}
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex gap-3 mt-4 justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowDocuments(true)}>
          <FolderOpen className="w-4 h-4 mr-2" />
          Alle documenten
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowActivityLog(true)}>
          <Clock className="w-4 h-4 mr-2" />
          Activiteitenlog ({timeline.length})
        </Button>
      </div>

      {/* Activity log slide-over */}
      <ActivityLogPanel
        timeline={timeline}
        isOpen={showActivityLog}
        onClose={() => setShowActivityLog(false)}
      />

      {/* Document archief dialog */}
      <Dialog open={showDocuments} onOpenChange={setShowDocuments}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alle documenten &amp; foto&apos;s</DialogTitle>
          </DialogHeader>
          <DocumentArchief attachments={allAttachments} />
        </DialogContent>
      </Dialog>

      {/* LEGACY Tabs placeholder — replaced by workflow stepper above */}
      {false && <Card>
        <Tabs defaultValue="jobs">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="jobs">
                <FileText className="w-4 h-4 mr-2" />
                Opdrachten ({jobs.length})
              </TabsTrigger>
              <TabsTrigger value="inspections">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Inspecties ({allChecklists.length})
              </TabsTrigger>
              <TabsTrigger value="certificates">
                <Shield className="w-4 h-4 mr-2" />
                Attesten ({certificates.length})
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Clock className="w-4 h-4 mr-2" />
                Tijdlijn ({timeline.length})
              </TabsTrigger>
              <TabsTrigger value="photos">
                <Camera className="w-4 h-4 mr-2" />
                Foto&apos;s ({sitePhotos.length})
              </TabsTrigger>
              <TabsTrigger value="documents">
                <ScanLine className="w-4 h-4 mr-2" />
                Documenten ({paperScans.length})
              </TabsTrigger>
              <TabsTrigger value="removals">
                <Package className="w-4 h-4 mr-2" />
                Verwijderingen ({allRemovals.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4">
            {/* TIMELINE */}
            <TabsContent value="timeline">
              {timeline.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Nog geen activiteiten voor dit pand.
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-0">
                    {timeline.map((event, i) => (
                      <div key={event.id} className="relative flex gap-4 pb-6">
                        <div className="relative z-10">
                          <Avatar className="h-10 w-10 border-2 border-background">
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                              {getInitials(event.actor?.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="text-sm font-medium">{event.action}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatDate(event.created_at)} — {formatTime(event.created_at)}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {event.actor?.role === "owner" ? "Eigenaar" : "Specialist"}
                            </Badge>
                          </div>
                          {(() => {
                            const details = event.details as Record<string, unknown> | null;
                            if (details && typeof details === "object" && "description" in details && details.description) {
                              return (
                                <p className="text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded p-2">
                                  {String(details.description)}
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* PHOTOS */}
            <TabsContent value="photos">
              {sitePhotos.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Nog geen sitefoto&apos;s beschikbaar.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {sitePhotos.map((att) => (
                    <div
                      key={att.id}
                      className="rounded-lg border overflow-hidden bg-muted cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => window.open(att.file_url, "_blank")}
                    >
                      <img
                        src={att.file_url}
                        alt={att.file_name}
                        className="w-full h-36 object-cover"
                      />
                      <div className="p-2.5">
                        <div className="text-xs font-medium truncate">{att.file_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(att.created_at)}
                        </div>
                        {att.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {att.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* DOCUMENTS / PAPER SCANS */}
            <TabsContent value="documents">
              {paperScans.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <ScanLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Nog geen documentscans beschikbaar.
                </div>
              ) : (
                <div className="space-y-2">
                  {paperScans.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => window.open(att.file_url, "_blank")}
                    >
                      <div className="w-11 h-14 rounded bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-extrabold text-red-700 tracking-wider">
                          {att.mime_type?.includes("pdf") ? "PDF" : "IMG"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{att.file_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(att.created_at)}
                          {att.file_size && ` — ${(att.file_size / 1024).toFixed(0)} KB`}
                        </div>
                        {att.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {att.description}
                          </div>
                        )}
                      </div>
                      <Badge variant="warning" className="shrink-0">
                        Document Scan
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* REMOVALS */}
            <TabsContent value="removals">
              {allRemovals.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Nog geen verwijderde componenten geregistreerd.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allRemovals.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border overflow-hidden bg-card hover:shadow-md transition-shadow"
                    >
                      {r.photo_url ? (
                        <img
                          src={r.photo_url}
                          alt={r.component_name}
                          className="w-full h-40 object-cover cursor-pointer"
                          onClick={() => window.open(r.photo_url!, "_blank")}
                        />
                      ) : (
                        <div className="w-full h-28 bg-muted flex items-center justify-center">
                          <Camera className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm">{r.component_name}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {r.location}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="success" className="text-[10px]">Verwijderd</Badge>
                            {r.handling_method && (
                              <Badge
                                variant={r.handling_method === "hermetische_zone" ? "warning" : "info"}
                                className="text-[10px]"
                              >
                                {r.handling_method === "hermetische_zone" ? "Hermetisch" : "Eenvoudig"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {r.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {r.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2.5 pt-2.5 border-t">
                          <Clock className="w-3 h-3" />
                          {new Date(r.removed_at).toLocaleDateString("nl-BE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* INSPECTIONS */}
            <TabsContent value="inspections">
              {allChecklists.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Nog geen inspecties uitgevoerd voor dit pand.
                </div>
              ) : (
                <div className="space-y-4">
                  {allChecklists.map((cl) => (
                    <Card key={cl.id} className="border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold">
                            Inspectie — {new Date(cl.inspected_at).toLocaleDateString("nl-BE", {
                              day: "numeric", month: "long", year: "numeric",
                            })}
                          </CardTitle>
                          <div className="flex gap-2">
                            {cl.risk_level && (
                              <Badge
                                variant={
                                  cl.risk_level === "laag" ? "success" :
                                  cl.risk_level === "gemiddeld" ? "warning" : "destructive"
                                }
                                className="text-[10px]"
                              >
                                Risico: {RISK_LEVEL_LABELS[cl.risk_level]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {cl.general_condition && (
                          <p className="text-sm text-muted-foreground mb-2">{cl.general_condition}</p>
                        )}
                        {cl.notes && (
                          <p className="text-xs text-muted-foreground mb-3 bg-muted/50 p-2 rounded">{cl.notes}</p>
                        )}
                        <div className="space-y-2">
                          {cl.items.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 p-2.5 rounded border bg-muted/20">
                              {item.photo_url && (
                                <img
                                  src={item.photo_url}
                                  alt={item.item_name}
                                  className="w-12 h-12 object-cover rounded cursor-pointer shrink-0"
                                  onClick={() => window.open(item.photo_url!, "_blank")}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                                  <span className="text-sm font-medium">{item.item_name}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {item.contains_asbestos !== null && (
                                    <Badge variant={item.contains_asbestos ? "destructive" : "success"} className="text-[10px]">
                                      {item.contains_asbestos ? "Asbest" : "Geen asbest"}
                                    </Badge>
                                  )}
                                  {item.condition && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {CONDITION_LABELS[item.condition]}
                                    </Badge>
                                  )}
                                  {item.priority && item.priority !== "geen_actie" && (
                                    <Badge
                                      variant={item.priority === "urgent" ? "destructive" : "warning"}
                                      className="text-[10px]"
                                    >
                                      {PRIORITY_LABELS[item.priority]}
                                    </Badge>
                                  )}
                                  {item.material_type && (
                                    <span className="text-xs text-muted-foreground">{item.material_type}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* CERTIFICATES */}
            <TabsContent value="certificates">
              {certificates.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Nog geen attesten voor dit pand.
                  {profile.role === "specialist" && (
                    <div className="mt-3">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/dossiers/${property.id}/attest`)}>
                        <Plus className="w-4 h-4 mr-1.5" />
                        Attest opmaken
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-sm font-mono font-bold">{cert.certificate_number}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {cert.issued_at
                              ? `Uitgegeven: ${new Date(cert.issued_at).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" })}`
                              : "Concept"
                            }
                            {cert.expires_at && ` — Vervalt: ${new Date(cert.expires_at).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" })}`}
                          </div>
                        </div>
                        <Badge variant={
                          cert.status === "issued" ? "success" :
                          cert.status === "expired" ? "destructive" :
                          cert.status === "revoked" ? "destructive" : "warning"
                        }>
                          {CERTIFICATE_STATUS_LABELS[cert.status]}
                        </Badge>
                      </div>
                      {cert.conclusion && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                          {cert.conclusion}
                        </p>
                      )}
                      {cert.items.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {cert.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                              <Badge variant={
                                item.risk_level === "kritiek" || item.risk_level === "hoog" ? "destructive" :
                                item.risk_level === "gemiddeld" ? "warning" : "success"
                              } className="text-[9px]">
                                {RISK_LEVEL_LABELS[item.risk_level]}
                              </Badge>
                              <span className="font-medium">{item.material_type}</span>
                              <span className="text-muted-foreground">— {item.location}</span>
                              <Badge variant="secondary" className="text-[9px] ml-auto">
                                {RECOMMENDED_ACTION_LABELS[item.recommended_action]}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* JOBS */}
            <TabsContent value="jobs">
              {(profile.role === "owner" || profile.role === "broker") && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setShowCreateJob(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Nieuwe opdracht
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push("/markt/nieuw")}>
                    <Store className="w-4 h-4 mr-1.5" />
                    Op marktplaats plaatsen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => router.push("/planning")}>
                    <CalendarDays className="w-4 h-4 mr-1.5" />
                    Plan afspraak
                  </Button>
                </div>
              )}
              {jobs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Nog geen opdrachten voor dit pand.
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
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
                              onClick={() => setShowAssign(job.id)}
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
                      {job.description && (
                        <p className="text-xs text-muted-foreground mb-2">{job.description}</p>
                      )}
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

                      {/* Quotes section */}
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
                      {job.specialist_id && (
                        <ChatPanel jobId={job.id} currentUser={profile} />
                      )}

                      {/* Status update controls */}
                      {(profile.role === "owner" || profile.role === "broker") && getNextStatuses(job.status).length > 0 && (
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
                              onClick={() => handleUpdateJobStatus(job.id, nextStatus)}
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

                      {/* GAP 2: Bewijs van Afvalverwerking (VLAREMA) */}
                      {(job.status === "in_progress" || job.status === "completed") && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Bewijs van Afvalverwerking (VLAREMA)
                            </span>
                            {profile.role === "specialist" && job.specialist_id === profile.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => {
                                  setDisposalUploadJobId(disposalUploadJobId === job.id ? null : job.id);
                                  setDisposalRef("");
                                  setDisposalFile(null);
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Certificaat toevoegen
                              </Button>
                            )}
                          </div>
                          {job.attachments.filter((a) => a.type === "disposal_certificate").map((cert) => (
                            <div key={cert.id} className="flex items-center gap-2 p-2 rounded border bg-muted/20 mb-1">
                              <FileText className="w-4 h-4 text-green-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{cert.file_name}</div>
                                {cert.disposal_reference && (
                                  <div className="text-[10px] text-muted-foreground">Ref: {cert.disposal_reference}</div>
                                )}
                              </div>
                              <Badge variant="success" className="text-[10px] shrink-0">Afvalcertificaat</Badge>
                            </div>
                          ))}
                          {job.attachments.filter((a) => a.type === "disposal_certificate").length === 0 && (
                            <p className="text-xs text-muted-foreground">Nog geen afvalcertificaat geüpload.</p>
                          )}
                          {disposalUploadJobId === job.id && (
                            <div className="mt-2 p-3 rounded-lg border border-primary/30 bg-primary/[0.02] space-y-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Referentienummer afvalverwerker</Label>
                                <Input
                                  placeholder="Bijv. VLAREMA-2024-001"
                                  value={disposalRef}
                                  onChange={(e) => setDisposalRef(e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Certificaat (PDF of afbeelding) <span className="text-destructive">*</span></Label>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="text-xs w-full"
                                  onChange={(e) => setDisposalFile(e.target.files?.[0] || null)}
                                />
                              </div>
                              <Button
                                size="sm"
                                className="w-full text-xs"
                                disabled={!disposalFile || uploadingDisposal}
                                onClick={() => handleDisposalUpload(job.id)}
                              >
                                {uploadingDisposal ? (
                                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Uploaden...</>
                                ) : (
                                  <><CheckCircle2 className="w-3 h-3 mr-1" />Certificaat uploaden</>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>}

      {/* Create Job Dialog */}
      <Dialog open={showCreateJob} onOpenChange={(open) => { if (!open) { setShowCreateJob(false); setJobTitle(""); setJobDescription(""); setJobError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuwe opdracht aanmaken</DialogTitle>
            <DialogDescription>
              Maak een nieuwe opdracht aan voor {property.address}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateJob} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">
                Titel <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jobTitle"
                placeholder="Bijv. Asbestinventarisatie dak"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobDesc">Beschrijving (optioneel)</Label>
              <Textarea
                id="jobDesc"
                placeholder="Bijv. Volledige inventarisatie van dakbedekking en goten"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            {jobError && <p className="text-sm text-destructive">{jobError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreateJob(false); setJobTitle(""); setJobDescription(""); setJobError(""); }}>
                Annuleren
              </Button>
              <Button type="submit" disabled={savingJob}>
                {savingJob ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Opdracht aanmaken
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Specialist Dialog */}
      <Dialog open={!!showAssign} onOpenChange={(open) => { if (!open) setShowAssign(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Specialist toewijzen</DialogTitle>
            <DialogDescription>
              Kies een erkende specialist uit het netwerk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {specialists.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Geen specialisten beschikbaar. Specialisten moeten zich eerst registreren op het platform.
              </p>
            ) : (
              specialists.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => showAssign && handleAssignSpecialist(showAssign, spec.id)}
                  disabled={assigningSpec}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-50 text-green-700 font-bold text-xs">
                      {getInitials(spec.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{spec.full_name}</div>
                    {spec.company_name && (
                      <div className="text-xs text-muted-foreground">{spec.company_name}</div>
                    )}
                    {spec.company_address && (
                      <div className="text-xs text-muted-foreground">{spec.company_address}</div>
                    )}
                  </div>
                  {assigningSpec ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RiskProfileCard({ checklists }: { checklists: (InspectionChecklist & { items: ChecklistItem[] })[] }) {
  const allItems = checklists.flatMap((cl) => cl.items);
  if (allItems.length === 0) return null;

  const itemsWithRisk = allItems.map((item) => {
    const risk = (item.calculated_risk as CalculatedRisk) || calculateRisk({
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

  const highestRiskItem = itemsWithRisk.find((i) => i.risk === "hoog") || itemsWithRisk.find((i) => i.risk === "verhoogd");

  let overallBadge: { label: string; variant: "success" | "warning" | "destructive" } = { label: "Laag risico", variant: "success" };
  if (riskCounts.hoog > 0) overallBadge = { label: "Hoog risico — actie vereist", variant: "destructive" };
  else if (riskCounts.verhoogd > 0) overallBadge = { label: "Verhoogd risico", variant: "warning" };

  const barSegments = [
    { key: "zeer_laag", pct: (riskCounts.zeer_laag / total) * 100, color: "bg-green-500" },
    { key: "laag", pct: (riskCounts.laag / total) * 100, color: "bg-blue-500" },
    { key: "verhoogd", pct: (riskCounts.verhoogd / total) * 100, color: "bg-orange-500" },
    { key: "hoog", pct: (riskCounts.hoog / total) * 100, color: "bg-red-500" },
  ];

  return (
    <Card className="mb-5">
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
            {barSegments.filter((s) => s.pct > 0).map((s) => (
              <div key={s.key} className={`${s.color} h-full`} style={{ width: `${s.pct}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {barSegments.filter((s) => s.pct > 0).map((s) => (
              <span key={s.key}>{CALCULATED_RISK_LABELS[s.key as CalculatedRisk]} ({Math.round(s.pct)}%)</span>
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

function GebouwgegevensCard({ property }: { property: Property }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup() {
    const adresMatch = property.address.trim().match(/^(.+?)\s+(\d+\w*)$/);
    const straat = adresMatch ? adresMatch[1] : property.address.trim();
    const huisnummer = adresMatch ? adresMatch[2] : "";

    if (!straat || !huisnummer) {
      setError("Kan straat en huisnummer niet afleiden uit het adres");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        straat,
        huisnummer,
        postcode: property.postal_code,
        stad: property.city,
      });

      const res = await fetch(`/api/basisregisters?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fout bij ophalen gebouwgegevens");
        return;
      }

      if (!data.found) {
        setError("Adres niet gevonden in het Gebouwenregister — je kunt handmatig doorgaan");
        return;
      }

      const details: GebouwDetails = data.details;
      await supabase
        .from("properties")
        .update({
          gebouweenheid_id: details.gebouweenheidId,
          gebouw_id: details.gebouwId,
          perceel_id: details.perceelId,
          bouwjaar: details.bouwjaar,
          gebouw_status: details.status,
          oppervlakte: details.oppervlakte,
          verdiepingen: details.verdiepingen,
          basisregisters_synced_at: new Date().toISOString(),
        })
        .eq("id", property.id);

      router.refresh();
    } catch {
      setError("Verbindingsfout — probeer opnieuw");
    } finally {
      setLoading(false);
    }
  }

  const isLinked = !!property.gebouweenheid_id;

  return (
    <Card className="mb-5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Gebouwgegevens</span>
            {isLinked && (
              <Badge variant="success" className="text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Gekoppeld aan Gebouwenregister
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {property.bouwjaar && property.bouwjaar < 2001 && (
              <Badge variant="warning" className="text-[10px]">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Asbestattest verplicht (OVAM)
              </Badge>
            )}
            {property.bouwjaar && property.bouwjaar >= 2001 && (
              <Badge variant="success" className="text-[10px]">
                Geen attestplicht
              </Badge>
            )}
          </div>
        </div>

        {isLinked ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <span className="text-muted-foreground">Gebouweenheid:</span>{" "}
                <span className="font-mono">{property.gebouweenheid_id}</span>
              </div>
              {property.bouwjaar && (
                <div>
                  <span className="text-muted-foreground">Bouwjaar:</span>{" "}
                  <span className="font-medium">{property.bouwjaar}</span>
                </div>
              )}
              {property.gebouw_status && (
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className="font-medium capitalize">{property.gebouw_status}</span>
                </div>
              )}
              {property.perceel_id && (
                <div>
                  <span className="text-muted-foreground">Perceel:</span>{" "}
                  <span className="font-mono">{property.perceel_id}</span>
                </div>
              )}
              {property.oppervlakte && (
                <div>
                  <span className="text-muted-foreground">Oppervlakte:</span>{" "}
                  <span className="font-medium">{property.oppervlakte} m²</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLookup}
                disabled={loading}
                className="text-xs text-muted-foreground"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                )}
                Vernieuwen
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Dit pand is nog niet gekoppeld aan het Vlaams Gebouwen- en Adressenregister.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLookup}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4 mr-2" />
              )}
              Koppel aan Gebouwenregister
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-xs text-blue-800">{error}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLookup}
              disabled={loading}
              className="text-xs text-blue-700 h-auto p-0"
            >
              Opnieuw proberen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
