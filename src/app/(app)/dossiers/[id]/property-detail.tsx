"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "@/lib/types";
import { PROPERTY_STATUS_LABELS, JOB_STATUS_LABELS, RISK_LEVEL_LABELS, CONDITION_LABELS, PRIORITY_LABELS } from "@/lib/types";
import { QuoteForm } from "@/components/quotes/quote-form";
import { QuoteDetail } from "@/components/quotes/quote-detail";
import { downloadAsbestReport } from "@/components/pdf/asbestos-report";

interface PropertyDetailProps {
  profile: Profile;
  property: Property;
  owner: Profile | null;
  jobs: (Job & { specialist: Profile | null; attachments: Attachment[]; removals: Removal[]; checklists: (InspectionChecklist & { items: ChecklistItem[] })[]; quotes: QuoteWithLines[] })[];
  timeline: (TimelineEvent & { actor: Profile })[];
  specialists: Profile[];
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

      await supabase.from("timeline_events").insert({
        property_id: property.id,
        job_id: jobId,
        actor_id: user.id,
        action: `Specialist toegewezen: ${specialist?.company_name || specialist?.full_name || "Onbekend"}`,
        details: { specialist_id: specialistId },
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

  const jobStatusFlow: JobStatus[] = [
    "pending", "inspection", "quoted", "approved", "in_progress", "completed",
  ];

  function getNextStatuses(current: JobStatus): JobStatus[] {
    const idx = jobStatusFlow.indexOf(current);
    if (idx === -1 || current === "completed" || current === "cancelled") return [];
    return jobStatusFlow.slice(idx + 1).concat(["cancelled"]);
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
              <div className="w-44">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Voortgang</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() =>
                  downloadAsbestReport({ property, owner, jobs })
                }
              >
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                PDF Rapport
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono">{jobs.length}</div>
              <div className="text-xs text-muted-foreground">Opdrachten</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono">{sitePhotos.length}</div>
              <div className="text-xs text-muted-foreground">Sitefoto&apos;s</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono">{paperScans.length}</div>
              <div className="text-xs text-muted-foreground">Documenten</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono">{allRemovals.length}</div>
              <div className="text-xs text-muted-foreground">Verwijderingen</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-lg font-bold font-mono">{timeline.length}</div>
              <div className="text-xs text-muted-foreground">Activiteiten</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs defaultValue="timeline">
          <CardHeader className="pb-0">
            <TabsList>
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
              <TabsTrigger value="inspections">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Inspecties ({allChecklists.length})
              </TabsTrigger>
              <TabsTrigger value="jobs">
                <FileText className="w-4 h-4 mr-2" />
                Opdrachten ({jobs.length})
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
                          <Badge variant="success" className="shrink-0 text-[10px]">
                            Verwijderd
                          </Badge>
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

            {/* JOBS */}
            <TabsContent value="jobs">
              {profile.role === "owner" && (
                <div className="mb-4">
                  <Button size="sm" onClick={() => setShowCreateJob(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Nieuwe opdracht
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
                            specialistId={profile.id}
                            existingQuote={job.quotes.length > 0 ? job.quotes[0] : null}
                            onSaved={() => router.refresh()}
                          />
                        </div>
                      )}
                      {profile.role === "owner" && job.quotes.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <QuoteDetail
                            quote={job.quotes[0]}
                            jobId={job.id}
                            onResponded={() => router.refresh()}
                          />
                        </div>
                      )}

                      {/* Status update controls */}
                      {profile.role === "owner" && getNextStatuses(job.status).length > 0 && (
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
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

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
