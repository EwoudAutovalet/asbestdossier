"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Camera,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  Save,
  ChevronRight,
  ChevronLeft,
  FlaskConical,
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
  AsbestosApplication,
  AsbestosBinder,
  ConditionScore,
  CoverageLevel,
  ExposureType,
  Accessibility,
  CalculatedRisk,
  RecommendedActionIP2,
  QuantityUnit,
  AnalysisMethod,
  SampleResult,
} from "@/lib/types";
import {
  RISK_LEVEL_LABELS,
  CONDITION_SCORE_LABELS,
  COVERAGE_LABELS,
  EXPOSURE_LABELS,
  ACCESSIBILITY_LABELS,
  CALCULATED_RISK_LABELS,
  RECOMMENDED_ACTION_IP2_LABELS,
  QUANTITY_UNIT_LABELS,
  ANALYSIS_METHOD_LABELS,
  SAMPLE_RESULT_LABELS,
  INSPECTION_CATEGORIES,
} from "@/lib/types";
import { calculateRisk, suggestAction, RISK_COLORS, RISK_BADGE_VARIANT } from "@/lib/risk-calculator";

interface InspectionChecklistProps {
  jobId: string;
  checklists: (InspectionChecklist & { items: ChecklistItem[] })[];
}

const CATEGORY_MAP: Record<string, string> = {
  Dak: "Dakbedekking",
  Gevelbekleding: "Gevelbekleding",
  Leidingen: "Leidingisolatie",
  Vloeren: "Vloeren",
  Isolatie: "Isolatie & brandwerend",
  Schoorsteen: "Dakbedekking",
  Kelder: "Overig",
  "Technische ruimte": "Isolatie & brandwerend",
  Overig: "Overig",
};

interface IP2Item {
  category: string;
  item_name: string;
  location_description: string;
  application_id: string | null;
  application_code: string | null;
  binder_id: string | null;
  is_hechtgebonden: boolean | null;
  contains_asbestos: boolean | null;
  material_type: string;
  quantity: number | null;
  quantity_unit: QuantityUnit | null;
  condition_score: ConditionScore | null;
  coverage: CoverageLevel | null;
  exposure: ExposureType | null;
  accessibility: Accessibility | null;
  calculated_risk: CalculatedRisk | null;
  recommended_action: RecommendedActionIP2 | null;
  notes: string;
  photo_file: File | null;
  photo_preview: string;
  has_sample: boolean;
  sample_number: string;
  analysis_method: AnalysisMethod | null;
  sample_result: SampleResult | null;
  lab_name: string;
  analyzed_at: string;
}

function createEmptyItem(): IP2Item {
  return {
    category: INSPECTION_CATEGORIES[0],
    item_name: "",
    location_description: "",
    application_id: null,
    application_code: null,
    binder_id: null,
    is_hechtgebonden: null,
    contains_asbestos: null,
    material_type: "",
    quantity: null,
    quantity_unit: null,
    condition_score: null,
    coverage: null,
    exposure: null,
    accessibility: null,
    calculated_risk: null,
    recommended_action: null,
    notes: "",
    photo_file: null,
    photo_preview: "",
    has_sample: false,
    sample_number: "",
    analysis_method: null,
    sample_result: null,
    lab_name: "",
    analyzed_at: "",
  };
}

export function InspectionChecklistComponent({ jobId, checklists }: InspectionChecklistProps) {
  const router = useRouter();
  const supabase = createClient();
  const photoRef = useRef<HTMLInputElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [generalCondition, setGeneralCondition] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("laag");
  const [checklistNotes, setChecklistNotes] = useState("");
  const [items, setItems] = useState<IP2Item[]>([]);

  const [showAddItem, setShowAddItem] = useState(false);
  const [step, setStep] = useState(1);
  const [currentItem, setCurrentItem] = useState<IP2Item>(createEmptyItem());

  const [applications, setApplications] = useState<AsbestosApplication[]>([]);
  const [binders, setBinders] = useState<AsbestosBinder[]>([]);

  useEffect(() => {
    async function loadRefData() {
      const [appRes, bindRes] = await Promise.all([
        supabase.from("asbestos_applications").select("*").order("sort_order"),
        supabase.from("asbestos_binders").select("*").order("sort_order"),
      ]);
      if (appRes.data) setApplications(appRes.data as AsbestosApplication[]);
      if (bindRes.data) setBinders(bindRes.data as AsbestosBinder[]);
    }
    loadRefData();
  }, []);

  const filteredApplications = useMemo(() => {
    const mappedCategory = CATEGORY_MAP[currentItem.category];
    if (!mappedCategory) return applications;
    return applications.filter((a) => a.category === mappedCategory);
  }, [currentItem.category, applications]);

  const filteredBinders = useMemo(() => {
    if (!currentItem.application_code) return binders;
    return binders.filter((b) => b.application_codes.includes(currentItem.application_code!));
  }, [currentItem.application_code, binders]);

  const computedRisk = useMemo(() => {
    return calculateRisk({
      is_hechtgebonden: currentItem.is_hechtgebonden,
      condition_score: currentItem.condition_score,
      exposure: currentItem.exposure,
      coverage: currentItem.coverage,
    });
  }, [currentItem.is_hechtgebonden, currentItem.condition_score, currentItem.exposure, currentItem.coverage]);

  function updateCurrentItem(updates: Partial<IP2Item>) {
    setCurrentItem((prev) => ({ ...prev, ...updates }));
  }

  function resetItemForm() {
    if (currentItem.photo_preview) URL.revokeObjectURL(currentItem.photo_preview);
    setCurrentItem(createEmptyItem());
    setStep(1);
    setShowAddItem(false);
  }

  function confirmItem() {
    const item: IP2Item = {
      ...currentItem,
      calculated_risk: computedRisk,
      recommended_action: currentItem.recommended_action || suggestAction(computedRisk),
      item_name: currentItem.item_name || (applications.find((a) => a.id === currentItem.application_id)?.name || currentItem.category),
    };
    setItems((prev) => [...prev, item]);
    resetItemForm();
  }

  function removeItem(idx: number) {
    const item = items[idx];
    if (item.photo_preview) URL.revokeObjectURL(item.photo_preview);
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
          notes: checklistNotes.trim() || null,
          completed: true,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      for (const item of items) {
        let photoUrl = null;

        if (item.photo_file) {
          const timestamp = Date.now();
          const sanitized = item.photo_file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
          const path = `${jobId}/inspection/${timestamp}_${sanitized}`;
          const { error: uploadError } = await supabase.storage
            .from("property-media")
            .upload(path, item.photo_file);
          if (!uploadError) {
            const { data } = supabase.storage.from("property-media").getPublicUrl(path);
            photoUrl = data.publicUrl;
          }
        }

        const { data: savedItem } = await supabase.from("checklist_items").insert({
          checklist_id: checklist.id,
          category: item.category,
          item_name: item.item_name,
          contains_asbestos: item.contains_asbestos,
          condition: item.condition_score ? (item.condition_score === "onbeschadigd" ? "goed" : item.condition_score === "licht_beschadigd" ? "beschadigd" : "ernstig_beschadigd") : null,
          material_type: item.material_type || null,
          location_description: item.location_description || null,
          photo_url: photoUrl,
          priority: item.calculated_risk === "hoog" ? "urgent" : item.calculated_risk === "verhoogd" ? "planning" : item.calculated_risk === "laag" ? "monitoring" : "geen_actie",
          notes: item.notes || null,
          application_id: item.application_id,
          binder_id: item.binder_id,
          is_hechtgebonden: item.is_hechtgebonden,
          quantity: item.quantity,
          quantity_unit: item.quantity_unit,
          condition_score: item.condition_score,
          coverage: item.coverage,
          exposure: item.exposure,
          accessibility: item.accessibility,
          calculated_risk: item.calculated_risk,
          sample_reference: item.has_sample ? item.sample_number : null,
          sample_result: item.has_sample && item.sample_result ? item.sample_result : null,
        }).select().single();

        if (item.has_sample && item.sample_number && savedItem) {
          await supabase.from("inspection_samples").insert({
            checklist_id: checklist.id,
            checklist_item_id: savedItem.id,
            sample_number: item.sample_number,
            material_description: item.material_type || null,
            location_description: item.location_description || null,
            analysis_method: item.analysis_method,
            result: item.sample_result,
            lab_name: item.lab_name || null,
            analyzed_at: item.analyzed_at || null,
          });
        }
      }

      const { data: job } = await supabase.from("jobs").select("property_id").eq("id", jobId).single();
      if (job) {
        await supabase.from("timeline_events").insert({
          property_id: job.property_id,
          job_id: jobId,
          actor_id: user.id,
          action: `IP2 Inspectiechecklist ingevuld — ${items.length} materialen geregistreerd`,
          details: { checklist_id: checklist.id, risk_level: riskLevel, item_count: items.length },
        });
      }

      setShowCreate(false);
      setGeneralCondition("");
      setRiskLevel("laag");
      setChecklistNotes("");
      setItems([]);
      toast({ title: "Inspectiechecklist opgeslagen (IP2)", variant: "success" });
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{checklists.length}</span>{" "}
          inspectie{checklists.length !== 1 ? "s" : ""} uitgevoerd
        </div>
        {!showCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nieuwe inspectie (IP2)
          </Button>
        )}
      </div>

      {showCreate && (
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardContent className="p-5">
            <form onSubmit={handleSaveChecklist} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  IP2 Inspectiechecklist
                </h3>
                <button type="button" onClick={() => { setShowCreate(false); setItems([]); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Algemene staat gebouw</Label>
                  <Input placeholder="Bijv. Matig onderhouden, bouwjaar ca. 1975" value={generalCondition} onChange={(e) => setGeneralCondition(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Risiconiveau (globaal)</Label>
                  <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as RiskLevel)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {(Object.keys(RISK_LEVEL_LABELS) as RiskLevel[]).map((level) => (
                      <option key={level} value={level}>{RISK_LEVEL_LABELS[level]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Opmerkingen</Label>
                <Textarea placeholder="Algemene opmerkingen..." value={checklistNotes} onChange={(e) => setChecklistNotes(e.target.value)} rows={2} className="resize-none" />
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Geïnspecteerde materialen ({items.length})
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddItem(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Materiaal toevoegen
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    Voeg materialen toe conform IP2-protocol.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">
                              {item.location_description || item.category} — {item.item_name}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.is_hechtgebonden !== null && (
                              <Badge variant={item.is_hechtgebonden ? "info" : "destructive"} className="text-[10px]">
                                {item.is_hechtgebonden ? "Hechtgebonden" : "Losgebonden"}
                              </Badge>
                            )}
                            {item.calculated_risk && (
                              <Badge variant={RISK_BADGE_VARIANT[item.calculated_risk]} className="text-[10px]">
                                {CALCULATED_RISK_LABELS[item.calculated_risk]}
                              </Badge>
                            )}
                            {item.condition_score && (
                              <Badge variant="secondary" className="text-[10px]">
                                {CONDITION_SCORE_LABELS[item.condition_score].split(" /")[0]}
                              </Badge>
                            )}
                            {item.quantity && item.quantity_unit && (
                              <span className="text-xs text-muted-foreground">
                                {item.quantity} {QUANTITY_UNIT_LABELS[item.quantity_unit]}
                              </span>
                            )}
                            {item.has_sample && (
                              <Badge variant="secondary" className="text-[10px]">
                                <FlaskConical className="w-2.5 h-2.5 mr-0.5" />
                                {item.sample_number}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opslaan...</>) : (<><Save className="w-4 h-4 mr-2" />Checklist opslaan ({items.length} items)</>)}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* IP2 Stepped Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={(open) => { if (!open) resetItemForm(); }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Materiaal registreren (IP2)</DialogTitle>
            <DialogDescription>
              Stap {step} van 5 — {["Locatie & Toepassing", "Materiaal & Hoeveelheid", "Toestandsbeoordeling", "Risicobeoordeling", "Foto & Monster"][step - 1]}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {/* Step 1: Locatie & Toepassing */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categorie/Ruimte</Label>
                  <select value={currentItem.category} onChange={(e) => updateCurrentItem({ category: e.target.value, application_id: null, application_code: null, binder_id: null, is_hechtgebonden: null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {INSPECTION_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Locatiebeschrijving</Label>
                  <Input placeholder="Bijv. Garage achterzijde, 2e verdieping" value={currentItem.location_description} onChange={(e) => updateCurrentItem({ location_description: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Toepassing</Label>
                {filteredApplications.length > 0 ? (
                  <select value={currentItem.application_id || ""} onChange={(e) => { const app = applications.find((a) => a.id === e.target.value); updateCurrentItem({ application_id: e.target.value || null, application_code: app?.code || null, item_name: app?.name || "", binder_id: null, is_hechtgebonden: null }); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecteer toepassing...</option>
                    {filteredApplications.map((app) => (<option key={app.id} value={app.id}>{app.name}</option>))}
                  </select>
                ) : (
                  <Input placeholder="Beschrijf de toepassing" value={currentItem.item_name} onChange={(e) => updateCurrentItem({ item_name: e.target.value })} />
                )}
              </div>
              {currentItem.application_code && filteredBinders.length > 0 && (
                <div className="space-y-2">
                  <Label>Bindmiddel</Label>
                  <select value={currentItem.binder_id || ""} onChange={(e) => { const binder = binders.find((b) => b.id === e.target.value); updateCurrentItem({ binder_id: e.target.value || null, is_hechtgebonden: binder?.is_hechtgebonden ?? null }); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecteer bindmiddel...</option>
                    {filteredBinders.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                  {currentItem.is_hechtgebonden !== null && (
                    <Badge variant={currentItem.is_hechtgebonden ? "info" : "destructive"}>
                      {currentItem.is_hechtgebonden ? "Hechtgebonden" : "Losgebonden (niet-hechtgebonden)"}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Materiaal & Hoeveelheid */}
          {step === 2 && (
            <div className="space-y-4">
              {!currentItem.binder_id && (
                <div className="space-y-2">
                  <Label>Hechtgebonden?</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([{ val: true, label: "Hechtgebonden", clr: "border-blue-300 bg-blue-50" }, { val: false, label: "Losgebonden", clr: "border-red-300 bg-red-50" }, { val: null, label: "Onbekend", clr: "border-border" }] as const).map((opt) => (
                      <button key={String(opt.val)} type="button" onClick={() => updateCurrentItem({ is_hechtgebonden: opt.val })} className={`p-2 rounded-lg border text-xs font-medium transition-colors ${currentItem.is_hechtgebonden === opt.val ? opt.clr : "border-border hover:border-muted-foreground/30"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Hoeveelheid</Label>
                  <Input type="number" step="0.1" placeholder="0" value={currentItem.quantity ?? ""} onChange={(e) => updateCurrentItem({ quantity: e.target.value ? parseFloat(e.target.value) : null })} />
                </div>
                <div className="space-y-2">
                  <Label>Eenheid</Label>
                  <select value={currentItem.quantity_unit || ""} onChange={(e) => updateCurrentItem({ quantity_unit: (e.target.value || null) as QuantityUnit | null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecteer...</option>
                    {(Object.keys(QUANTITY_UNIT_LABELS) as QuantityUnit[]).map((u) => (<option key={u} value={u}>{QUANTITY_UNIT_LABELS[u]}</option>))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bevat asbest?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([{ val: true, label: "Ja", clr: "border-red-300 bg-red-50" }, { val: false, label: "Nee", clr: "border-green-300 bg-green-50" }, { val: null, label: "Vermoedelijk", clr: "border-amber-300 bg-amber-50" }] as const).map((opt) => (
                    <button key={String(opt.val)} type="button" onClick={() => updateCurrentItem({ contains_asbestos: opt.val })} className={`p-2 rounded-lg border text-xs font-medium transition-colors ${currentItem.contains_asbestos === opt.val ? opt.clr : "border-border hover:border-muted-foreground/30"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Materiaalbeschrijving</Label>
                <Input placeholder="Aanvullende details over het materiaal" value={currentItem.material_type} onChange={(e) => updateCurrentItem({ material_type: e.target.value })} />
              </div>
            </div>
          )}

          {/* Step 3: Toestandsbeoordeling */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Toestandsscore</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CONDITION_SCORE_LABELS) as ConditionScore[]).map((cs) => {
                    const colors: Record<ConditionScore, string> = { onbeschadigd: "border-green-400 bg-green-50", licht_beschadigd: "border-yellow-400 bg-yellow-50", matig_beschadigd: "border-orange-400 bg-orange-50", zwaar_beschadigd: "border-red-400 bg-red-50" };
                    return (
                      <button key={cs} type="button" onClick={() => updateCurrentItem({ condition_score: cs })} className={`p-2.5 rounded-lg border text-xs font-medium transition-colors text-left ${currentItem.condition_score === cs ? colors[cs] : "border-border hover:border-muted-foreground/30"}`}>
                        {CONDITION_SCORE_LABELS[cs]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mate van afdekking</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(COVERAGE_LABELS) as CoverageLevel[]).map((cl) => {
                    const colors: Record<CoverageLevel, string> = { volledig_afgedekt: "border-green-400 bg-green-50", gedeeltelijk_afgedekt: "border-yellow-400 bg-yellow-50", niet_afgedekt: "border-red-400 bg-red-50" };
                    return (
                      <button key={cl} type="button" onClick={() => updateCurrentItem({ coverage: cl })} className={`p-2.5 rounded-lg border text-xs font-medium transition-colors ${currentItem.coverage === cl ? colors[cl] : "border-border hover:border-muted-foreground/30"}`}>
                        {COVERAGE_LABELS[cl]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Blootstelling</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["geen", "buitenlucht", "binnenlucht", "beide"] as ExposureType[]).map((et) => {
                    const colors: Record<ExposureType, string> = { geen: "border-green-400 bg-green-50", buitenlucht: "border-yellow-400 bg-yellow-50", binnenlucht: "border-orange-400 bg-orange-50", beide: "border-red-400 bg-red-50" };
                    return (
                      <button key={et} type="button" onClick={() => updateCurrentItem({ exposure: et })} className={`p-2.5 rounded-lg border text-xs font-medium transition-colors ${currentItem.exposure === et ? colors[et] : "border-border hover:border-muted-foreground/30"}`}>
                        {EXPOSURE_LABELS[et]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bereikbaarheid</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["niet_bereikbaar", "beperkt_bereikbaar", "vrij_bereikbaar"] as Accessibility[]).map((ac) => {
                    const colors: Record<Accessibility, string> = { niet_bereikbaar: "border-green-400 bg-green-50", beperkt_bereikbaar: "border-yellow-400 bg-yellow-50", vrij_bereikbaar: "border-red-400 bg-red-50" };
                    return (
                      <button key={ac} type="button" onClick={() => updateCurrentItem({ accessibility: ac })} className={`p-2.5 rounded-lg border text-xs font-medium transition-colors ${currentItem.accessibility === ac ? colors[ac] : "border-border hover:border-muted-foreground/30"}`}>
                        {ACCESSIBILITY_LABELS[ac]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Risicobeoordeling */}
          {step === 4 && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${RISK_COLORS[computedRisk]}`}>
                <div className="flex items-center gap-3">
                  {computedRisk === "zeer_laag" && <CheckCircle2 className="w-8 h-8" />}
                  {computedRisk === "laag" && <Info className="w-8 h-8" />}
                  {computedRisk === "verhoogd" && <AlertTriangle className="w-8 h-8" />}
                  {computedRisk === "hoog" && <AlertOctagon className="w-8 h-8" />}
                  <div>
                    <div className="text-lg font-bold">{CALCULATED_RISK_LABELS[computedRisk]}</div>
                    <div className="text-xs opacity-75">Berekend risiconiveau</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Aanbevolen actie</Label>
                <select value={currentItem.recommended_action || suggestAction(computedRisk)} onChange={(e) => updateCurrentItem({ recommended_action: e.target.value as RecommendedActionIP2 })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {(Object.keys(RECOMMENDED_ACTION_IP2_LABELS) as RecommendedActionIP2[]).map((a) => (
                    <option key={a} value={a}>{RECOMMENDED_ACTION_IP2_LABELS[a]}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Automatisch gesuggereerd op basis van risicoscore. Kan handmatig worden aangepast.</p>
              </div>
            </div>
          )}

          {/* Step 5: Foto & Monster */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Foto</Label>
                {currentItem.photo_preview ? (
                  <div className="relative inline-block">
                    <img src={currentItem.photo_preview} alt="Preview" className="w-full max-w-xs h-32 object-cover rounded-lg border" />
                    <button type="button" onClick={() => { URL.revokeObjectURL(currentItem.photo_preview); updateCurrentItem({ photo_file: null, photo_preview: "" }); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-1.5" />Foto toevoegen
                  </Button>
                )}
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) updateCurrentItem({ photo_file: file, photo_preview: URL.createObjectURL(file) }); }} />
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Textarea placeholder="Extra notities..." value={currentItem.notes} onChange={(e) => updateCurrentItem({ notes: e.target.value })} rows={2} className="resize-none" />
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="flex-1">Monster genomen?</Label>
                  <button type="button" onClick={() => updateCurrentItem({ has_sample: !currentItem.has_sample })} className={`relative w-10 h-5 rounded-full transition-colors ${currentItem.has_sample ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${currentItem.has_sample ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
                {currentItem.has_sample && (
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Monsternummer *</Label>
                        <Input placeholder="M-001" value={currentItem.sample_number} onChange={(e) => updateCurrentItem({ sample_number: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Analysemethode</Label>
                        <select value={currentItem.analysis_method || ""} onChange={(e) => updateCurrentItem({ analysis_method: (e.target.value || null) as AnalysisMethod | null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">Selecteer...</option>
                          {(Object.keys(ANALYSIS_METHOD_LABELS) as AnalysisMethod[]).map((m) => (<option key={m} value={m}>{ANALYSIS_METHOD_LABELS[m]}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Laboratorium</Label>
                        <Input placeholder="Naam labo" value={currentItem.lab_name} onChange={(e) => updateCurrentItem({ lab_name: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Resultaat</Label>
                        <select value={currentItem.sample_result || ""} onChange={(e) => updateCurrentItem({ sample_result: (e.target.value || null) as SampleResult | null })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">Wacht op analyse...</option>
                          {(Object.keys(SAMPLE_RESULT_LABELS) as SampleResult[]).map((r) => (<option key={r} value={r}>{SAMPLE_RESULT_LABELS[r]}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Analysedatum</Label>
                      <Input type="date" value={currentItem.analyzed_at} onChange={(e) => updateCurrentItem({ analyzed_at: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div>
              {step > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Vorige
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetItemForm}>Annuleren</Button>
              {step < 5 ? (
                <Button type="button" size="sm" onClick={() => setStep(step + 1)}>
                  Volgende<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={confirmItem} disabled={!currentItem.item_name && !currentItem.application_id}>
                  <Plus className="w-4 h-4 mr-1" />Toevoegen
                </Button>
              )}
            </div>
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
                  Inspectie — {new Date(cl.inspected_at).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {cl.risk_level && (
                    <Badge variant={cl.risk_level === "laag" ? "success" : cl.risk_level === "gemiddeld" ? "warning" : "destructive"} className="text-[10px]">
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
              {cl.general_condition && <p className="text-sm text-muted-foreground mb-3">{cl.general_condition}</p>}
              {cl.notes && <p className="text-xs text-muted-foreground mb-3 bg-muted/50 p-2 rounded">{cl.notes}</p>}
              <div className="space-y-2">
                {cl.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    {item.photo_url && (
                      <img src={item.photo_url} alt={item.item_name} className="w-14 h-14 object-cover rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {item.location_description || item.category} — {item.item_name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.is_hechtgebonden !== undefined && item.is_hechtgebonden !== null && (
                          <Badge variant={item.is_hechtgebonden ? "info" : "destructive"} className="text-[10px]">
                            {item.is_hechtgebonden ? "Hechtgebonden" : "Losgebonden"}
                          </Badge>
                        )}
                        {item.calculated_risk && (
                          <Badge variant={RISK_BADGE_VARIANT[item.calculated_risk as CalculatedRisk]} className="text-[10px]">
                            {CALCULATED_RISK_LABELS[item.calculated_risk as CalculatedRisk]}
                          </Badge>
                        )}
                        {item.condition_score && (
                          <Badge variant="secondary" className="text-[10px]">
                            {CONDITION_SCORE_LABELS[item.condition_score as ConditionScore].split(" /")[0]}
                          </Badge>
                        )}
                        {item.quantity && item.quantity_unit && (
                          <span className="text-xs text-muted-foreground">
                            {item.quantity} {QUANTITY_UNIT_LABELS[item.quantity_unit as QuantityUnit]}
                          </span>
                        )}
                        {item.sample_reference && (
                          <Badge variant="secondary" className="text-[10px]">
                            <FlaskConical className="w-2.5 h-2.5 mr-0.5" />
                            {item.sample_reference}
                          </Badge>
                        )}
                        {item.contains_asbestos !== null && !item.calculated_risk && (
                          <Badge variant={item.contains_asbestos ? "destructive" : "success"} className="text-[10px]">
                            {item.contains_asbestos ? "Asbest" : "Geen asbest"}
                          </Badge>
                        )}
                      </div>
                      {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>}
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
