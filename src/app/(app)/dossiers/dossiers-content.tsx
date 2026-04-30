"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Building2,
  Search,
  Plus,
  MapPin,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Profile, Property, PropertyStatus } from "@/lib/types";
import { PROPERTY_STATUS_LABELS } from "@/lib/types";

interface DossiersContentProps {
  profile: Profile;
  properties: Property[];
}

const statusVariant: Record<PropertyStatus, "warning" | "info" | "purple" | "success"> = {
  new: "warning",
  inspection: "info",
  remediation: "purple",
  cleared: "success",
};

export function DossiersContent({ profile, properties }: DossiersContentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const filtered = properties.filter((p) =>
    [p.address, p.city, p.postal_code]
      .some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  function resetForm() {
    setNewAddress("");
    setNewCity("");
    setNewPostalCode("");
    setNewDescription("");
    setError("");
    setShowCreate(false);
  }

  async function handleCreateProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddress.trim() || !newCity.trim() || !newPostalCode.trim()) return;
    setSaving(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { data: property, error: insertError } = await supabase
        .from("properties")
        .insert({
          owner_id: user.id,
          address: newAddress.trim(),
          city: newCity.trim(),
          postal_code: newPostalCode.trim(),
          description: newDescription.trim() || null,
          status: "new",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.from("timeline_events").insert({
        property_id: property.id,
        actor_id: user.id,
        action: "Pand aangemeld voor asbestinventarisatie",
        details: {
          address: newAddress.trim(),
          city: newCity.trim(),
        },
      });

      resetForm();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dossiers</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} panden</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken op adres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-60"
            />
          </div>
          {profile.role === "owner" && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nieuw pand
            </Button>
          )}
        </div>
      </div>

      {/* Create Property Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nieuw pand aanmelden</DialogTitle>
            <DialogDescription>
              Registreer een nieuw pand voor asbestinventarisatie.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProperty} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">
                Adres <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="Bijv. Kerkstraat 42"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="postalCode">
                  Postcode <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="postalCode"
                  placeholder="2000"
                  value={newPostalCode}
                  onChange={(e) => setNewPostalCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">
                  Gemeente <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="Antwerpen"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving (optioneel)</Label>
              <Textarea
                id="description"
                placeholder="Bijv. Vrijstaande woning, bouwjaar 1975, vermoeden van asbest in dakbedekking"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuleren
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Pand aanmelden
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_160px_160px_100px_40px] gap-4 px-6 py-3 bg-muted/50 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Adres</span>
            <span>Gemeente</span>
            <span>Status</span>
            <span>Datum</span>
            <span></span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Geen panden gevonden.
            </div>
          ) : (
            filtered.map((prop) => (
              <div
                key={prop.id}
                onClick={() => router.push(`/dossiers/${prop.id}`)}
                className="grid grid-cols-[1fr_160px_160px_100px_40px] gap-4 px-6 py-4 border-b last:border-b-0 items-center cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">{prop.address}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {prop.postal_code} {prop.city}
                </div>
                <Badge variant={statusVariant[prop.status]}>
                  {PROPERTY_STATUS_LABELS[prop.status]}
                </Badge>
                <div className="text-xs text-muted-foreground font-mono">
                  {new Date(prop.created_at).toLocaleDateString("nl-BE")}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
