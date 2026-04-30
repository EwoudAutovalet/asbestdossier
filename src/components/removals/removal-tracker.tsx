"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Camera,
  Plus,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  Trash2,
  X,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Removal } from "@/lib/types";

interface RemovalTrackerProps {
  jobId: string;
  removals: Removal[];
}

export function RemovalTracker({ jobId, removals }: RemovalTrackerProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [componentName, setComponentName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function resetForm() {
    setComponentName("");
    setLocation("");
    setDescription("");
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    setShowForm(false);
  }

  function handlePhotoSelect(file: File | null) {
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!componentName.trim() || !location.trim()) return;
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      let photoUrl: string | null = null;
      let photoFileName: string | null = null;

      if (photoFile) {
        const timestamp = Date.now();
        const sanitized = photoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `${jobId}/removals/${timestamp}_${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from("property-media")
          .upload(path, photoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("property-media")
          .getPublicUrl(path);

        photoUrl = data.publicUrl;
        photoFileName = photoFile.name;
      }

      const { error: dbError } = await supabase.from("removals").insert({
        job_id: jobId,
        specialist_id: user.id,
        component_name: componentName.trim(),
        location: location.trim(),
        description: description.trim() || null,
        photo_url: photoUrl,
        photo_file_name: photoFileName,
      });

      if (dbError) throw dbError;

      // Timeline event
      const { data: job } = await supabase
        .from("jobs")
        .select("property_id")
        .eq("id", jobId)
        .single();

      if (job) {
        await supabase.from("timeline_events").insert({
          property_id: job.property_id,
          job_id: jobId,
          actor_id: user.id,
          action: `Component verwijderd: ${componentName.trim()}`,
          details: {
            component: componentName.trim(),
            location: location.trim(),
            description: description.trim() || null,
            has_photo: !!photoUrl,
          },
        });
      }

      resetForm();
      router.refresh();
    } catch (err) {
      console.error("Removal save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(removalId: string) {
    setDeletingId(removalId);
    try {
      await supabase.from("removals").delete().eq("id", removalId);
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{removals.length}</span>{" "}
          component{removals.length !== 1 ? "en" : ""} geregistreerd
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Verwijdering registreren
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Nieuwe verwijdering registreren</h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="component">
                    Component <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="component"
                      placeholder="Bijv. Golfplaten, Vloertegels, Leidingisolatie..."
                      value={componentName}
                      onChange={(e) => setComponentName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Locatie <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="Bijv. Dak noordzijde, Kelder, Technische ruimte..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Opmerkingen</Label>
                <Textarea
                  id="notes"
                  placeholder="Bijv. 12m² golfplaten verwijderd, dubbel verpakt in folie, afgevoerd via container 3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Photo capture */}
              <div className="space-y-2">
                <Label>Bewijsfoto</Label>
                {photoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full max-w-xs h-48 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(photoPreview);
                        setPhotoPreview("");
                        setPhotoFile(null);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.capture = "environment";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handlePhotoSelect(file);
                        };
                        input.click();
                      }}
                    >
                      <Camera className="w-4 h-4 mr-1.5" />
                      Foto nemen
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-4 h-4 mr-1.5" />
                      Uit galerij
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoSelect(file);
                      }}
                    />
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Verwijdering registreren
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Removals Grid */}
      {removals.length === 0 && !showForm ? (
        <div className="p-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">Nog geen verwijderingen geregistreerd</p>
          <p className="text-xs">Registreer elke verwijderde component met een bewijsfoto</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {removals.map((r) => (
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
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(r.removed_at).toLocaleDateString("nl-BE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Verwijderen"
                  >
                    {deletingId === r.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
