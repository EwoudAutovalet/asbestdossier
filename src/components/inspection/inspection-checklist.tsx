"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Camera,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type {
  InspectionChecklist,
  ChecklistItem,
  RiskLevel,
  ItemCondition,
  ItemPriority,
} from "@/lib/types";
import {
  RISK_LEVEL_LABELS,
  CONDITION_LABELS,
  PRIORITY_LABELS,
  INSPECTION_CATEGORIES,
} from "@/lib/types";

interface InspectionChecklistProps {
  jobId: string;
  checklists: (InspectionChecklist & { items: ChecklistItem[] })[];
}

const RISK_COLORS: Record<RiskLevel, string> = {
  laag: "success",
  gemiddeld: "warning",
  hoog: "destructive",
  kritiek: "destructive",
};

const PRIORITY_COLORS: Record<ItemPriority, string> = {
  geen_actie: "secondary",
  monitoring: "info",
  planning: "warning",
  urgent: "destructive",
};

export function InspectionChecklistComponent({ jobId, checklists }: InspectionChecklistProps) {
  const router = useRouter();
  const supabase = createClient();
  const photoRef = useRef<HTMLInputElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Checklist form state
  const [generalCondition, setGeneralCondition] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("laag");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Partial<ChecklistItem>[]>([]);

  // Item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemCategory, setItemCategory] = useState<string>(INSPECTION_CATEGORIES[0]);
  const [itemName, setItemName] = useState("");
  const [containsAsbestos, setContainsAsbestos] = useState<boolean | null>(null);
  const [itemCondition, setItemCondition] = useState<ItemCondition>("goed");
  const [materialType, setMaterialType] = useState("");
  const [locationDesc, setLocationDesc] = useState("");
  const [itemPriority, setItemPriority] = useState<ItemPriority>("geen_actie");
  const [itemNotes, setItemNotes] = useState("");
  const [itemPhotoFile, setItemPhotoFile] = useState<File | null>(null);
  const [itemPhotoPreview, setItemPhotoPreview] = useState("");

  function resetItemForm() {
    setItemCategory(INSPECTION_CATEGORIES[0]);
    setItemName("");
    setContainsAsbestos(null);
    setItemCondition("goed");
    setMaterialType("");
    setLocationDesc("");
    setItemPriority("geen_actie");
    setItemNotes("");
    if (itemPhotoPreview) URL.revokeObjectURL(itemPhotoPreview);
    setItemPhotoFile(null);
    setItemPhotoPreview("");
    setShowAddItem(false);
  }

  function addItem() {
    if (!itemName.trim()) return;

    const newItem: Partial<ChecklistItem> = {
      category: itemCategory,
      item_name: itemName.trim(),
      contains_asbestos: containsAsbestos,
      condition: itemCondition,
      material_type: materialType.trim() || null,
      location_description: locationDesc.trim() || null,
      priority: itemPriority,
      notes: itemNotes.trim() || null,
      photo_url: itemPhotoPreview || null,
    };

    setItems((prev) => [...prev, { ...newItem, _file: itemPhotoFile } as Partial<ChecklistItem> & { _file?: File }]);
    resetItemForm();
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveChecklist(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast({ title: "Voeg minimaal 1 item toe", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { data: checklist, error: checklistError } = await supabase
        .from("inspection_checklists")
        .insert({
          job_id: jobId,
          specialist_id: user.id,
          general_condition: generalCondition.trim() || null,
          risk_level: riskLevel,
          notes: notes.trim() || null,
          completed: true,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      for (const item of items) {
        let photoUrl = null;
        const fileItem = item as Partial<ChecklistItem> & { _file?: File };

        if (fileItem._file) {
          const timestamp = Date.now();
          const sanitized = fileItem._file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const path = `${jobId}/inspection/${timestamp}_${sanitized}`;

          const { error: uploadError } = await supabase.storage
            .from("property-media")
            .upload(path, fileItem._file);

          if (!uploadError) {
            const { data } = supabase.storage.from("property-media").getPublicUrl(path);
            photoUrl = data.publicUrl;
          }
        }

        await supabase.from("checklist_items").insert({
          checklist_id: checklist.id,
          category: item.category!,
          item_name: item.item_name!,
          contains_asbestos: item.contains_asbestos ?? null,
          condition: item.condition ?? null,
          material_type: item.material_type ?? null,
          location_description: item.location_description ?? null,
          photo_url: photoUrl,
          priority: item.priority ?? null,
          notes: item.notes ?? null,
        });
      }

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
          action: `Inspectiechecklist ingevuld — Risiconiveau: ${RISK_LEVEL_LABELS[riskLevel]}`,
          details: {
            checklist_id: checklist.id,
            risk_level: riskLevel,
            item_count: items.length,
            asbestos_found: items.filter((i) => i.contains_asbestos).length,
          },
        });
      }

      setShowCreate(false);
      setGeneralCondition("");
      setRiskLevel("laag");
      setNotes("");
      setItems([]);
      toast({ title: "Inspectiechecklist opgeslagen", variant: "success" });
      router.refresh();
    } catch (err) {
      console.error("Checklist save failed:", err);
      toast({ title: "Opslaan mislukt", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{checklists.length}</span>{" "}
          inspectie{checklists.length !== 1 ? "s" : ""} uitgevoerd
        </div>
        {!showCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nieuwe inspectie
          </Button>
        )}
      </div>

      {/* Create checklist form */}
      {showCreate && (
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardContent className="p-5">
            <form onSubmit={handleSaveChecklist} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Inspectiechecklist invullen
                </h3>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setItems([]); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Algemene staat gebouw</Label>
                  <Input
                    placeholder="Bijv. Matig onderhouden, bouwjaar ca. 1975"
                    value={generalCondition}
                    onChange={(e) => setGeneralCondition(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Risiconiveau</Label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {(Object.keys(RISK_LEVEL_LABELS) as RiskLevel[]).map((level) => (
                      <option key={level} value={level}>
                        {RISK_LEVEL_LABELS[level]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Opmerkingen</Label>
                <Textarea
                  placeholder="Algemene opmerkingen over de inspectie..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              <Separator />

              {/* Items list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Geïnspecteerde items ({items.length})
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddItem(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Item toevoegen
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    Voeg items toe die je hebt geïnspecteerd.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {item.category}
                            </Badge>
                            <span className="text-sm font-semibold">{item.item_name}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {item.contains_asbestos !== null && (
                              <Badge
                                variant={item.contains_asbestos ? "destructive" : "success"}
                                className="text-[10px]"
                              >
                                {item.contains_asbestos ? "Asbest aanwezig" : "Geen asbest"}
                              </Badge>
                            )}
                            {item.condition && (
                              <Badge variant="secondary" className="text-[10px]">
                                {CONDITION_LABELS[item.condition]}
                              </Badge>
                            )}
                            {item.priority && item.priority !== "geen_actie" && (
                              <Badge
                                variant={PRIORITY_COLORS[item.priority] as "warning" | "info" | "destructive" | "secondary"}
                                className="text-[10px]"
                              >
                                {PRIORITY_LABELS[item.priority]}
                              </Badge>
                            )}
                            {item.material_type && (
                              <span className="text-xs text-muted-foreground">
                                {item.material_type}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
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
                    <Save className="w-4 h-4 mr-2" />
                    Checklist opslaan ({items.length} items)
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Add item dialog */}
      <Dialog open={showAddItem} onOpenChange={(open) => { if (!open) resetItemForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inspectie-item toevoegen</DialogTitle>
            <DialogDescription>
              Registreer een geïnspecteerd onderdeel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categorie</Label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {INSPECTION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>
                  Naam <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Bijv. Golfplaten, Vensterbank"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bevat asbest?</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: true, label: "Ja", color: "border-red-300 bg-red-50" },
                  { val: false, label: "Nee", color: "border-green-300 bg-green-50" },
                  { val: null, label: "Onbekend", color: "border-border" },
                ].map((opt) => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => setContainsAsbestos(opt.val as boolean | null)}
                    className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                      containsAsbestos === opt.val
                        ? opt.color
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Staat</Label>
                <select
                  value={itemCondition}
                  onChange={(e) => setItemCondition(e.target.value as ItemCondition)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {(Object.keys(CONDITION_LABELS) as ItemCondition[]).map((c) => (
                    <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Prioriteit</Label>
                <select
                  value={itemPriority}
                  onChange={(e) => setItemPriority(e.target.value as ItemPriority)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {(Object.keys(PRIORITY_LABELS) as ItemPriority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Materiaaltype</Label>
                <Input
                  placeholder="Bijv. chrysotiel, amosiet"
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Locatie</Label>
                <Input
                  placeholder="Bijv. Dak noordzijde"
                  value={locationDesc}
                  onChange={(e) => setLocationDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opmerkingen</Label>
              <Textarea
                placeholder="Extra notities..."
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Foto</Label>
              {itemPhotoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={itemPhotoPreview}
                    alt="Preview"
                    className="w-full max-w-xs h-32 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(itemPhotoPreview);
                      setItemPhotoPreview("");
                      setItemPhotoFile(null);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
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
                    onClick={() => photoRef.current?.click()}
                  >
                    <Camera className="w-4 h-4 mr-1.5" />
                    Foto toevoegen
                  </Button>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setItemPhotoFile(file);
                        setItemPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetItemForm}>
              Annuleren
            </Button>
            <Button
              type="button"
              onClick={addItem}
              disabled={!itemName.trim()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Item toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing checklists */}
      {checklists.length === 0 && !showCreate ? (
        <div className="p-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">Nog geen inspecties uitgevoerd</p>
          <p className="text-xs">Start een inspectiechecklist om bevindingen te registreren</p>
        </div>
      ) : (
        checklists.map((cl) => (
          <Card key={cl.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Inspectie — {new Date(cl.inspected_at).toLocaleDateString("nl-BE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {cl.risk_level && (
                    <Badge
                      variant={RISK_COLORS[cl.risk_level] as "success" | "warning" | "destructive"}
                      className="text-[10px]"
                    >
                      Risico: {RISK_LEVEL_LABELS[cl.risk_level]}
                    </Badge>
                  )}
                  <Badge variant={cl.completed ? "success" : "warning"} className="text-[10px]">
                    {cl.completed ? "Voltooid" : "In uitvoering"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cl.general_condition && (
                <p className="text-sm text-muted-foreground mb-3">{cl.general_condition}</p>
              )}
              {cl.notes && (
                <p className="text-xs text-muted-foreground mb-3 bg-muted/50 p-2 rounded">{cl.notes}</p>
              )}
              <div className="space-y-2">
                {cl.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    {item.photo_url && (
                      <img
                        src={item.photo_url}
                        alt={item.item_name}
                        className="w-16 h-16 object-cover rounded cursor-pointer shrink-0"
                        onClick={() => window.open(item.photo_url!, "_blank")}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {item.category}
                        </Badge>
                        <span className="text-sm font-semibold">{item.item_name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {item.contains_asbestos !== null && (
                          <Badge
                            variant={item.contains_asbestos ? "destructive" : "success"}
                            className="text-[10px]"
                          >
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
                            variant={PRIORITY_COLORS[item.priority] as "warning" | "info" | "destructive" | "secondary"}
                            className="text-[10px]"
                          >
                            {PRIORITY_LABELS[item.priority]}
                          </Badge>
                        )}
                        {item.material_type && (
                          <span className="text-xs text-muted-foreground">{item.material_type}</span>
                        )}
                      </div>
                      {item.location_description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.location_description}</p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
