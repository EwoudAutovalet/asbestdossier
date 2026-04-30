"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import {
  Camera,
  FileText,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  ImageIcon,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { AttachmentType } from "@/lib/types";

interface SmartUploadProps {
  jobId: string;
  onUploadComplete: () => void;
}

interface FilePreview {
  file: File;
  preview: string;
}

export function SmartUpload({ jobId, onUploadComplete }: SmartUploadProps) {
  const [activeCategory, setActiveCategory] = useState<AttachmentType>("site_photo");
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const supabase = createClient();

  const categories = [
    {
      type: "site_photo" as AttachmentType,
      label: "Sitefoto",
      description: "Foto's van de locatie, voortgang of asbestbevindingen",
      icon: Camera,
      accept: "image/*",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      type: "paper_scan" as AttachmentType,
      label: "Document Scan",
      description: "Foto's van papierwerk, labrapporten, attesten",
      icon: ScanLine,
      accept: "image/*,.pdf",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ];

  const activeConfig = categories.find((c) => c.type === activeCategory)!;

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles: FilePreview[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  function removeFile(index: number) {
    setSelectedFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    try {
      const bucket =
        activeCategory === "site_photo" ? "property-media" : "official-documents";

      for (const { file } of selectedFiles) {
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${jobId}/${activeCategory}/${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error: dbError } = await supabase.from("attachments").insert({
          job_id: jobId,
          uploaded_by: user!.id,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          type: activeCategory,
          description,
          metadata: {
            original_name: file.name,
            upload_timestamp: new Date().toISOString(),
            category: activeCategory,
          },
        });

        if (dbError) throw dbError;
      }

      // Log timeline event
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: job } = await supabase
        .from("jobs")
        .select("property_id")
        .eq("id", jobId)
        .single();

      if (job && user) {
        await supabase.from("timeline_events").insert({
          property_id: job.property_id,
          job_id: jobId,
          actor_id: user.id,
          action: `${selectedFiles.length} ${activeCategory === "site_photo" ? "foto's" : "documenten"} geüpload`,
          details: {
            count: selectedFiles.length,
            type: activeCategory,
            description,
          },
        });
      }

      selectedFiles.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setSelectedFiles([]);
      setDescription("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      onUploadComplete();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Category Toggle */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.type}
            onClick={() => {
              setActiveCategory(cat.type);
              setSelectedFiles([]);
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              activeCategory === cat.type
                ? `${cat.borderColor} ${cat.bgColor}`
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeCategory === cat.type ? cat.bgColor : "bg-muted"
                }`}
              >
                <cat.icon
                  className={`w-5 h-5 ${
                    activeCategory === cat.type ? cat.color : "text-muted-foreground"
                  }`}
                />
              </div>
              <div>
                <div className="font-semibold text-sm">{cat.label}</div>
                <div className="text-xs text-muted-foreground">{cat.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? `${activeConfig.borderColor} ${activeConfig.bgColor}`
            : "border-border hover:border-muted-foreground/30"
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          Sleep bestanden hierheen of klik om te selecteren
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {activeCategory === "site_photo"
            ? "JPG, PNG, HEIC — max 10MB per bestand"
            : "JPG, PNG, PDF — max 10MB per bestand"}
        </p>
        <label>
          <Button variant="outline" size="sm" asChild>
            <span>
              <Upload className="w-3.5 h-3.5 mr-2" />
              Bestanden kiezen
            </span>
          </Button>
          <input
            type="file"
            multiple
            accept={activeConfig.accept}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </label>
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {selectedFiles.length} bestand{selectedFiles.length !== 1 ? "en" : ""} geselecteerd
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {selectedFiles.map((f, i) => (
              <div key={i} className="relative group rounded-lg border overflow-hidden bg-muted">
                {f.preview ? (
                  <img
                    src={f.preview}
                    alt={f.file.name}
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{f.file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(f.file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                activeCategory === "site_photo"
                  ? "Bijv. Foto's van dakbedekking noordzijde — asbest golfplaten zichtbaar"
                  : "Bijv. Labresultaat staalname kelder — positief op chrysotiel"
              }
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Upload Button */}
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploaden...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {selectedFiles.length} bestand{selectedFiles.length !== 1 ? "en" : ""} uploaden als{" "}
                {activeCategory === "site_photo" ? "Sitefoto" : "Document Scan"}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Upload geslaagd
            </DialogTitle>
            <DialogDescription>
              Je bestanden zijn succesvol geüpload en toegevoegd aan het dossier.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowSuccess(false)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
