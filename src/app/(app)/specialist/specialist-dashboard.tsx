"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MapPin,
  Clock,
  Camera,
  FileText,
  ChevronRight,
  ImageIcon,
  ScanLine,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SmartUpload } from "@/components/upload/smart-upload";
import { RemovalTracker } from "@/components/removals/removal-tracker";
import type { Profile, Job, Property, Attachment, Removal, JobStatus } from "@/lib/types";
import { JOB_STATUS_LABELS } from "@/lib/types";

interface SpecialistDashboardProps {
  profile: Profile;
  jobs: (Job & { property: Property; attachments: Attachment[]; removals: Removal[] })[];
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

export function SpecialistDashboard({ profile, jobs }: SpecialistDashboardProps) {
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    jobs.length > 0 ? jobs[0].id : null
  );

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const sitePhotos = selectedJob?.attachments.filter((a) => a.type === "site_photo") || [];
  const paperScans = selectedJob?.attachments.filter((a) => a.type === "paper_scan") || [];
  const removals = selectedJob?.removals || [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Specialist Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Beheer je opdrachten en upload documentatie
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Mijn opdrachten ({jobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {jobs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Geen opdrachten toegewezen.
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id}>
                  <button
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                      selectedJobId === job.id
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-muted/50 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{job.title}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {job.property?.address}
                      </div>
                    </div>
                    <Badge variant={statusVariant[job.status]} className="shrink-0 text-[10px]">
                      {JOB_STATUS_LABELS[job.status]}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                  <Separator />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Job Detail + Upload */}
        <div className="lg:col-span-2 space-y-4">
          {selectedJob ? (
            <>
              {/* Job Info */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-bold">{selectedJob.title}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedJob.property?.address}, {selectedJob.property?.postal_code}{" "}
                        {selectedJob.property?.city}
                      </div>
                    </div>
                    <Badge variant={statusVariant[selectedJob.status]}>
                      {JOB_STATUS_LABELS[selectedJob.status]}
                    </Badge>
                  </div>
                  {selectedJob.description && (
                    <p className="text-sm text-muted-foreground">{selectedJob.description}</p>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {sitePhotos.length} foto&apos;s
                    </div>
                    <div className="flex items-center gap-1">
                      <ScanLine className="w-3.5 h-3.5" />
                      {paperScans.length} documenten
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {removals.length} verwijdering{removals.length !== 1 ? "en" : ""}
                    </div>
                    {selectedJob.total_cost && (
                      <div className="flex items-center gap-1">
                        &euro;{selectedJob.total_cost.toLocaleString("nl-BE")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs: Upload / Existing */}
              <Card>
                <Tabs defaultValue="upload">
                  <CardHeader className="pb-0">
                    <TabsList className="w-full">
                      <TabsTrigger value="upload" className="flex-1">
                        <Camera className="w-4 h-4 mr-2" />
                        Upload
                      </TabsTrigger>
                      <TabsTrigger value="photos" className="flex-1">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Foto&apos;s ({sitePhotos.length})
                      </TabsTrigger>
                      <TabsTrigger value="documents" className="flex-1">
                        <FileText className="w-4 h-4 mr-2" />
                        Documenten ({paperScans.length})
                      </TabsTrigger>
                      <TabsTrigger value="removals" className="flex-1">
                        <Package className="w-4 h-4 mr-2" />
                        Verwijderingen ({removals.length})
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <TabsContent value="upload">
                      <SmartUpload
                        jobId={selectedJob.id}
                        onUploadComplete={() => router.refresh()}
                      />
                    </TabsContent>

                    <TabsContent value="photos">
                      {sitePhotos.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          Nog geen sitefoto&apos;s geüpload voor deze opdracht.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {sitePhotos.map((att) => (
                            <div key={att.id} className="rounded-lg border overflow-hidden bg-muted">
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="w-full h-32 object-cover"
                              />
                              <div className="p-2">
                                <div className="text-xs font-medium truncate">{att.file_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(att.created_at).toLocaleDateString("nl-BE")}
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

                    <TabsContent value="documents">
                      {paperScans.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          Nog geen documentscans geüpload voor deze opdracht.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {paperScans.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                              onClick={() => window.open(att.file_url, "_blank")}
                            >
                              <div className="w-10 h-12 rounded bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-amber-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{att.file_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(att.created_at).toLocaleDateString("nl-BE")}
                                  {att.file_size && ` — ${(att.file_size / 1024).toFixed(0)} KB`}
                                </div>
                                {att.description && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {att.description}
                                  </div>
                                )}
                              </div>
                              <Badge variant="warning" className="shrink-0 text-[10px]">
                                SCAN
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="removals">
                      <RemovalTracker jobId={selectedJob.id} removals={removals} />
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecteer een opdracht om details te bekijken en bestanden te uploaden.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
