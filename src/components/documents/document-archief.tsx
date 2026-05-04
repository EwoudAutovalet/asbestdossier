"use client";

import { Camera, ScanLine, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Attachment } from "@/lib/types";

interface DocumentArchiefProps {
  attachments: Attachment[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DocumentArchief({ attachments }: DocumentArchiefProps) {
  const photos = attachments.filter((a) => a.type === "site_photo");
  const docs = attachments.filter((a) => a.type !== "site_photo");

  return (
    <Tabs defaultValue="documents">
      <TabsList className="mb-4">
        <TabsTrigger value="documents">Alle documenten ({docs.length})</TabsTrigger>
        <TabsTrigger value="photos">Foto&apos;s ({photos.length})</TabsTrigger>
      </TabsList>

      {/* All documents tab */}
      <TabsContent value="documents">
        {docs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <ScanLine className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Nog geen documenten beschikbaar.
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => window.open(att.file_url, "_blank")}
              >
                <div
                  className={`w-11 h-14 rounded border flex items-center justify-center shrink-0 ${
                    att.type === "disposal_certificate"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  {att.type === "disposal_certificate" ? (
                    <FileText className="w-5 h-5 text-green-600" />
                  ) : (
                    <span className="text-[9px] font-extrabold text-red-700 tracking-wider">
                      {att.mime_type?.includes("pdf") ? "PDF" : "IMG"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{att.file_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(att.created_at)}
                    {att.file_size && ` — ${(att.file_size / 1024).toFixed(0)} KB`}
                  </div>
                  {att.type === "disposal_certificate" && att.disposal_reference && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Ref: {att.disposal_reference}
                    </div>
                  )}
                  {att.description && (
                    <div className="text-xs text-muted-foreground mt-1">{att.description}</div>
                  )}
                </div>
                <Badge
                  variant={att.type === "disposal_certificate" ? "success" : "warning"}
                  className="shrink-0"
                >
                  {att.type === "disposal_certificate" ? "Afvalcertificaat" : "Document Scan"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Photos tab */}
      <TabsContent value="photos">
        {photos.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Nog geen sitefoto&apos;s beschikbaar.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((att) => (
              <div
                key={att.id}
                className="rounded-lg border overflow-hidden bg-muted cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => window.open(att.file_url, "_blank")}
              >
                <img src={att.file_url} alt={att.file_name} className="w-full h-36 object-cover" />
                <div className="p-2.5">
                  <div className="text-xs font-medium truncate">{att.file_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatDate(att.created_at)}</div>
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
    </Tabs>
  );
}
