"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Send } from "lucide-react";
import type { QuoteWithLines } from "@/lib/types";
import { QUOTE_STATUS_LABELS } from "@/lib/types";
import { notify, addTimelineEvent } from "@/lib/notifications";

interface QuoteLine {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface QuoteFormProps {
  jobId: string;
  propertyId: string;
  specialistId: string;
  existingQuote?: QuoteWithLines | null;
  onSaved?: () => void;
}

const UNITS = ["stuk", "m²", "m³", "uur", "forfait"];

export function QuoteForm({ jobId, propertyId, specialistId, existingQuote, onSaved }: QuoteFormProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  const [laborCost, setLaborCost] = useState(existingQuote?.labor_cost ?? 0);
  const [materialCost, setMaterialCost] = useState(existingQuote?.material_cost ?? 0);
  const [disposalCost, setDisposalCost] = useState(existingQuote?.disposal_cost ?? 0);
  const [validUntil, setValidUntil] = useState(existingQuote?.valid_until?.slice(0, 10) ?? "");
  const [description, setDescription] = useState(existingQuote?.description ?? "");
  const [notes, setNotes] = useState(existingQuote?.notes ?? "");
  const [lines, setLines] = useState<QuoteLine[]>(
    existingQuote?.lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.unit_price,
    })) ?? []
  );

  const isSubmitted = existingQuote && existingQuote.status !== "draft";

  const lineTotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  const grandTotal = laborCost + materialCost + disposalCost + lineTotal;

  function addLine() {
    setLines((prev) => [...prev, { description: "", quantity: 1, unit: "stuk", unit_price: 0 }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof QuoteLine, value: string | number) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  async function handleSave(submit: boolean) {
    setSaving(true);
    try {
      let quoteId = existingQuote?.id;

      const quoteData = {
        job_id: jobId,
        specialist_id: specialistId,
        status: submit ? "submitted" as const : "draft" as const,
        description: description || null,
        labor_cost: laborCost,
        material_cost: materialCost,
        disposal_cost: disposalCost,
        valid_until: validUntil || null,
        notes: notes || null,
        ...(submit ? { submitted_at: new Date().toISOString() } : {}),
      };

      if (quoteId) {
        const { error } = await supabase
          .from("quotes")
          .update(quoteData)
          .eq("id", quoteId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("quotes")
          .insert(quoteData)
          .select("id")
          .single();
        if (error) throw error;
        quoteId = data.id;
      }

      // Sync lines: delete existing, insert fresh
      if (existingQuote) {
        await supabase.from("quote_lines").delete().eq("quote_id", quoteId!);
      }

      if (lines.length > 0) {
        const lineInserts = lines.map((l, i) => ({
          quote_id: quoteId!,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          sort_order: i,
        }));
        const { error: lineError } = await supabase.from("quote_lines").insert(lineInserts);
        if (lineError) throw lineError;
      }

      if (submit) {
        await supabase.from("jobs").update({ status: "quoted" }).eq("id", jobId);

        const { data: jobData } = await supabase
          .from("jobs")
          .select("property:properties(owner_id)")
          .eq("id", jobId)
          .single();

        const ownerId = (jobData?.property as unknown as { owner_id: string } | null)?.owner_id;
        if (ownerId) {
          await notify({
            supabase,
            userId: ownerId,
            type: "quote_submitted",
            title: "Nieuwe offerte ontvangen",
            body: `Totaal: €${grandTotal.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`,
            metadata: { job_id: jobId, quote_id: quoteId },
          });
        }

        await addTimelineEvent({
          supabase,
          propertyId,
          jobId,
          actorId: specialistId,
          action: "Offerte ingediend",
          details: { total: grandTotal },
        });
      }

      toast({
        title: submit ? "Offerte ingediend" : "Offerte opgeslagen",
        description: submit
          ? "De eigenaar kan deze offerte nu bekijken."
          : "Offerte opgeslagen als concept.",
        variant: "success",
      });

      onSaved?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Fout bij opslaan", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Offerte</CardTitle>
            <Badge
              variant={
                existingQuote.status === "approved"
                  ? "success"
                  : existingQuote.status === "rejected"
                  ? "destructive"
                  : "info"
              }
            >
              {QUOTE_STATUS_LABELS[existingQuote.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {existingQuote.description && (
            <p className="text-muted-foreground">{existingQuote.description}</p>
          )}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Arbeid:</span>{" "}
              <span className="font-mono font-semibold">&euro;{existingQuote.labor_cost.toLocaleString("nl-BE")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Materiaal:</span>{" "}
              <span className="font-mono font-semibold">&euro;{existingQuote.material_cost.toLocaleString("nl-BE")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Afvoer:</span>{" "}
              <span className="font-mono font-semibold">&euro;{existingQuote.disposal_cost.toLocaleString("nl-BE")}</span>
            </div>
          </div>
          {existingQuote.lines.length > 0 && (
            <div className="border rounded-md overflow-hidden mt-2">
              <div className="grid grid-cols-[1fr_60px_60px_70px_80px] gap-1 px-3 py-1.5 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>Omschrijving</span>
                <span>Aantal</span>
                <span>Eenheid</span>
                <span>Prijs</span>
                <span className="text-right">Totaal</span>
              </div>
              {existingQuote.lines.map((line) => (
                <div
                  key={line.id}
                  className="grid grid-cols-[1fr_60px_60px_70px_80px] gap-1 px-3 py-1.5 border-t text-xs"
                >
                  <span>{line.description}</span>
                  <span className="font-mono">{line.quantity}</span>
                  <span>{line.unit}</span>
                  <span className="font-mono">&euro;{line.unit_price.toLocaleString("nl-BE")}</span>
                  <span className="font-mono text-right font-semibold">
                    &euro;{line.total.toLocaleString("nl-BE")}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2 border-t">
            <div className="text-right">
              <span className="text-xs text-muted-foreground mr-2">Totaal:</span>
              <span className="text-lg font-extrabold font-mono">
                &euro;{existingQuote.total_cost.toLocaleString("nl-BE")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {existingQuote ? "Offerte bewerken" : "Offerte opstellen"}
          </CardTitle>
          {existingQuote && (
            <Badge variant="warning">{QUOTE_STATUS_LABELS[existingQuote.status]}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Omschrijving</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Korte omschrijving van de offerte..."
            className="mt-1 text-sm"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Arbeidskosten (&euro;)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={laborCost}
              onChange={(e) => setLaborCost(Number(e.target.value))}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label className="text-xs">Materiaalkosten (&euro;)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={materialCost}
              onChange={(e) => setMaterialCost(Number(e.target.value))}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label className="text-xs">Afvoerkosten (&euro;)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={disposalCost}
              onChange={(e) => setDisposalCost(Number(e.target.value))}
              className="mt-1 font-mono"
            />
          </div>
        </div>

        {/* Quote lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-bold">Offerteregels</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Regel toevoegen
            </Button>
          </div>

          {lines.length > 0 && (
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_90px_90px_32px] gap-2 items-end">
                  <div>
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">Omschrijving</Label>}
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(i, "description", e.target.value)}
                      placeholder="Beschrijving..."
                      className="text-sm h-9"
                    />
                  </div>
                  <div>
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">Aantal</Label>}
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.quantity}
                      onChange={(e) => updateLine(i, "quantity", Number(e.target.value))}
                      className="text-sm h-9 font-mono"
                    />
                  </div>
                  <div>
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">Eenheid</Label>}
                    <select
                      value={line.unit}
                      onChange={(e) => updateLine(i, "unit", e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <Label className="text-[10px] text-muted-foreground">Prijs (&euro;)</Label>}
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price}
                      onChange={(e) => updateLine(i, "unit_price", Number(e.target.value))}
                      className="text-sm h-9 font-mono"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(i)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}

              <div className="flex justify-end text-xs text-muted-foreground pt-1">
                Regels subtotaal:{" "}
                <span className="font-mono font-semibold ml-1">
                  &euro;{lineTotal.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Geldig tot</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-end justify-end">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Totaal (incl. regels)
              </div>
              <div className="text-xl font-extrabold font-mono">
                &euro;{grandTotal.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs">Opmerkingen</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Extra opmerkingen..."
            className="mt-1 text-sm"
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Opslaan als concept
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            Offerte indienen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
