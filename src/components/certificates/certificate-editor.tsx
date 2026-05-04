"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileCheck,
  Loader2,
  AlertTriangle,
  Shield,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type {
  Profile,
  Property,
  Job,
  InspectionChecklist,
  ChecklistItem,
  InventoryCertificate,
  CertificateItem,
  RiskLevel,
  AsbestosType,
  RecommendedAction,
} from "@/lib/types";
import {
  CERTIFICATE_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  ASBESTOS_TYPE_LABELS,
  RECOMMENDED_ACTION_LABELS,
} from "@/lib/types";

interface CertificateEditorProps {
  profile: Profile;
  property: Property;
  owner: Profile | null;
  jobs: (Job & { checklists: (InspectionChecklist & { items: ChecklistItem[] })[] })[];
  asbestosItems: (ChecklistItem & { jobTitle: string; checklistDate: string })[];
  existingCertificates: (InventoryCertificate & { items: CertificateItem[] })[];
}

interface EditableItem {
  id?: string;
  location: string;
  material_type: string;
  asbestos_type: AsbestosType;
  condition: string;
  risk_level: RiskLevel;
  recommended_action: RecommendedAction;
  photo_url: string;
  notes: string;
  sort_order: number;
}

export function CertificateEditor({
  profile,
  property,
  owner,
  jobs,
  asbestosItems,
  existingCertificates,
}: CertificateEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [conclusion, setConclusion] = useState("");
  const [riskSummary, setRiskSummary] = useState("");
  const [items, setItems] = useState<EditableItem[]>(() =>
    asbestosItems.map((item, i) => ({
      location: item.location_description || item.category,
      material_type: item.material_type || item.item_name,
      asbestos_type: "hechtgebonden" as AsbestosType,
      condition: item.condition || "goed",
      risk_level: (item.priority === "urgent" ? "hoog" : item.priority === "planning" ? "gemiddeld" : "laag") as RiskLevel,
      recommended_action: (item.priority === "urgent" ? "verwijderen" : item.priority === "planning" ? "inkapselen" : "monitoring") as RecommendedAction,
      photo_url: item.photo_url || "",
      notes: item.notes || "",
      sort_order: i,
    }))
  );

  function addItem() {
    setItems([
      ...items,
      {
        location: "",
        material_type: "",
        asbestos_type: "hechtgebonden",
        condition: "goed",
        risk_level: "laag",
        recommended_action: "monitoring",
        photo_url: "",
        notes: "",
        sort_order: items.length,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof EditableItem, value: string) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const jobId = jobs.length > 0 ? jobs[0].id : null;

      const { data: cert, error: certError } = await supabase
        .from("inventory_certificates")
        .insert({
          property_id: property.id,
          job_id: jobId,
          specialist_id: profile.id,
          status: "draft",
          conclusion: conclusion || null,
          risk_summary: { summary: riskSummary },
        })
        .select()
        .single();

      if (certError) throw certError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("certificate_items")
          .insert(
            items.map((item, i) => ({
              certificate_id: cert.id,
              location: item.location,
              material_type: item.material_type,
              asbestos_type: item.asbestos_type,
              condition: item.condition,
              risk_level: item.risk_level,
              recommended_action: item.recommended_action,
              photo_url: item.photo_url || null,
              notes: item.notes || null,
              sort_order: i,
            }))
          );
        if (itemsError) throw itemsError;
      }

      router.refresh();
    } catch (err) {
      console.error("Save draft failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleIssueCertificate(certificateId: string) {
    setIssuing(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 5);

      const { error } = await supabase
        .from("inventory_certificates")
        .update({
          status: "issued",
          issued_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", certificateId);

      if (error) throw error;

      if (owner) {
        await notify({
          supabase,
          userId: owner.id,
          type: "certificate_issued",
          title: "Nieuw asbestinventarisatie-attest uitgegeven",
          body: `Een AIA-attest is uitgegeven voor ${property.address}`,
          link: `/dossiers/${property.id}`,
        });
      }

      router.refresh();
    } catch (err) {
      console.error("Issue certificate failed:", err);
    } finally {
      setIssuing(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dossiers/${property.id}`)}
          className="text-primary"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Terug naar dossier
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground font-mono text-xs">
          Asbestinventarisatie-attest
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Asbestinventarisatie-attest (AIA)
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          OVAM-conform attest voor {property.address}, {property.postal_code} {property.city}
        </p>
      </div>

      {/* Existing certificates */}
      {existingCertificates.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Bestaande attesten
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {existingCertificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between px-5 py-3 border-t"
              >
                <div>
                  <div className="text-sm font-mono font-semibold">{cert.certificate_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {cert.issued_at
                      ? `Uitgegeven: ${new Date(cert.issued_at).toLocaleDateString("nl-BE")}`
                      : "Concept"}
                    {cert.expires_at && ` — Vervalt: ${new Date(cert.expires_at).toLocaleDateString("nl-BE")}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      cert.status === "issued" ? "success" :
                      cert.status === "expired" ? "destructive" :
                      cert.status === "revoked" ? "destructive" : "warning"
                    }
                  >
                    {CERTIFICATE_STATUS_LABELS[cert.status]}
                  </Badge>
                  {cert.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleIssueCertificate(cert.id)}
                      disabled={issuing}
                    >
                      {issuing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Uitgeven"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* New certificate form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Nieuw attest opmaken
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {asbestosItems.length === 0 && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-800">Geen asbestitems gevonden</div>
                <div className="text-xs text-amber-700 mt-1">
                  Er zijn geen items met asbest gedetecteerd in de inspectiechecklist. U kunt handmatig items toevoegen.
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Risico-samenvatting</Label>
            <Textarea
              placeholder="Algemene risicobeoordeling van het pand..."
              value={riskSummary}
              onChange={(e) => setRiskSummary(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Conclusie en aanbevelingen</Label>
            <Textarea
              placeholder="Eindconclusie: beschrijving van de algehele asbeststatus en aanbevolen vervolgstappen..."
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-bold">Geïnventariseerde materialen</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Item toevoegen
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground border rounded-lg">
                Geen items. Voeg handmatig items toe of voer eerst een inspectie uit.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        Item {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Locatie</Label>
                        <Input
                          placeholder="Bijv. Dak, Kelder..."
                          value={item.location}
                          onChange={(e) => updateItem(index, "location", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Materiaaltype</Label>
                        <Input
                          placeholder="Bijv. Golfplaat, Isolatie..."
                          value={item.material_type}
                          onChange={(e) => updateItem(index, "material_type", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Asbesttype</Label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                          value={item.asbestos_type}
                          onChange={(e) => updateItem(index, "asbestos_type", e.target.value)}
                        >
                          <option value="hechtgebonden">{ASBESTOS_TYPE_LABELS.hechtgebonden}</option>
                          <option value="losgebonden">{ASBESTOS_TYPE_LABELS.losgebonden}</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Toestand</Label>
                        <Input
                          placeholder="Bijv. Goed, Beschadigd..."
                          value={item.condition}
                          onChange={(e) => updateItem(index, "condition", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Risiconiveau</Label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                          value={item.risk_level}
                          onChange={(e) => updateItem(index, "risk_level", e.target.value)}
                        >
                          {(["laag", "gemiddeld", "hoog", "kritiek"] as RiskLevel[]).map((level) => (
                            <option key={level} value={level}>{RISK_LEVEL_LABELS[level]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Aanbevolen actie</Label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                          value={item.recommended_action}
                          onChange={(e) => updateItem(index, "recommended_action", e.target.value)}
                        >
                          {(["verwijderen", "inkapselen", "monitoring"] as RecommendedAction[]).map((action) => (
                            <option key={action} value={action}>{RECOMMENDED_ACTION_LABELS[action]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Opmerkingen</Label>
                      <Input
                        placeholder="Eventuele opmerkingen..."
                        value={item.notes}
                        onChange={(e) => updateItem(index, "notes", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSaveDraft} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Opslaan als concept
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
