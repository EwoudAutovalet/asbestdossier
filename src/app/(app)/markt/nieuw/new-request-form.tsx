"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ArrowLeft, Store, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { Profile, Property, MarketplaceWorkType, MarketplaceUrgency } from "@/lib/types";
import { MARKETPLACE_WORK_TYPE_LABELS, MARKETPLACE_URGENCY_LABELS } from "@/lib/types";

interface NewRequestFormProps {
  profile: Profile;
  properties: Property[];
}

export function NewRequestForm({ profile, properties }: NewRequestFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [propertyId, setPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workType, setWorkType] = useState<MarketplaceWorkType>("inspection");
  const [urgency, setUrgency] = useState<MarketplaceUrgency>("flexible");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedProperty = properties.find((p) => p.id === propertyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId || !title.trim() || !selectedProperty) return;
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("marketplace_requests")
        .insert({
          owner_id: selectedProperty.owner_id,
          property_id: propertyId,
          title: title.trim(),
          description: description.trim() || null,
          work_type: workType,
          urgency,
          deadline: deadline || null,
          budget_indication: budget ? parseFloat(budget) : null,
          postal_code: selectedProperty.postal_code,
          city: selectedProperty.city,
          bouwjaar: selectedProperty.bouwjaar,
          oppervlakte: selectedProperty.oppervlakte,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      // Timeline event
      await supabase.from("timeline_events").insert({
        property_id: propertyId,
        actor_id: profile.id,
        action: "Aanvraag op marktplaats geplaatst",
        details: { request_id: data.id, work_type: workType, urgency },
      });

      toast({
        title: "Aanvraag geplaatst",
        description: "Specialisten kunnen nu bieden op je aanvraag.",
        variant: "success",
      });

      router.push(`/markt/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Fout bij plaatsen", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/markt")}
          className="text-primary"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Marktplaats
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Nieuwe aanvraag</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          Nieuwe aanvraag plaatsen
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Specialisten in jouw regio kunnen op deze aanvraag bieden. Je adres blijft anoniem tot je een bod aanvaardt.
        </p>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium mb-1">Nog geen panden geregistreerd</p>
            <p className="text-xs text-muted-foreground mb-4">
              Voeg eerst een pand toe via Dossiers voordat je een aanvraag plaatst.
            </p>
            <Button size="sm" onClick={() => router.push("/dossiers")}>
              Naar Dossiers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Aanvraagdetails</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Pand <span className="text-destructive">*</span></Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                >
                  <option value="">Selecteer pand...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address}, {p.postal_code} {p.city}
                    </option>
                  ))}
                </select>
                {selectedProperty && (
                  <p className="text-[11px] text-muted-foreground">
                    Voor specialisten zichtbaar als: <strong>{selectedProperty.postal_code} {selectedProperty.city}</strong>
                    {selectedProperty.bouwjaar && ` — bouwjaar ${selectedProperty.bouwjaar}`}
                    {selectedProperty.oppervlakte && ` — ${selectedProperty.oppervlakte} m²`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Titel <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Bijv. Asbestinventarisatie dak woning bouwjaar 1972"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type werk</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value as MarketplaceWorkType)}
                  >
                    {(Object.keys(MARKETPLACE_WORK_TYPE_LABELS) as MarketplaceWorkType[]).map((t) => (
                      <option key={t} value={t}>{MARKETPLACE_WORK_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Urgentie</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as MarketplaceUrgency)}
                  >
                    {(Object.keys(MARKETPLACE_URGENCY_LABELS) as MarketplaceUrgency[]).map((u) => (
                      <option key={u} value={u}>{MARKETPLACE_URGENCY_LABELS[u]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Deadline (optioneel)</Label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Indicatief budget € (optioneel)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="Bijv. 1500"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Beschrijving</Label>
                <Textarea
                  placeholder="Bijv. Vrijstaande woning, twee verdiepingen, vermoeden van asbestplaten op dak en in kelder. Volledige inventarisatie nodig met attest..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                  Geef voldoende context zodat specialisten een passend bod kunnen maken.
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => router.push("/markt")}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={saving || !propertyId || !title.trim()}>
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Plaatsen...</>
                  ) : (
                    <><Store className="w-4 h-4 mr-2" />Aanvraag plaatsen</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
