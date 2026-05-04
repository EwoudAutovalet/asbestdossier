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
  AlertTriangle,
  Info,
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
import type { Profile, Property, PropertyStatus, GebouwDetails } from "@/lib/types";
import { PROPERTY_STATUS_LABELS } from "@/lib/types";

interface DossiersContentProps {
  profile: Profile;
  properties: Property[];
  linkedOwners?: Profile[];
}

const statusVariant: Record<PropertyStatus, "warning" | "info" | "purple" | "success"> = {
  new: "warning",
  inspection: "info",
  remediation: "purple",
  cleared: "success",
};

type SortField = "created_at" | "address" | "city" | "status";
type SortDir = "asc" | "desc";

export function DossiersContent({ profile, properties, linkedOwners = [] }: DossiersContentProps) {
  const router = useRouter();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");

  const [gebouwLoading, setGebouwLoading] = useState(false);
  const [gebouwDetails, setGebouwDetails] = useState<GebouwDetails | null>(null);
  const [gebouwError, setGebouwError] = useState<string | null>(null);

  const filtered = properties
    .filter((p) =>
      [p.address, p.city, p.postal_code]
        .some((s) => s.toLowerCase().includes(search.toLowerCase()))
    )
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .filter((p) => ownerFilter === "all" || p.owner_id === ownerFilter)
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "created_at") return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return dir * a[sortField].localeCompare(b[sortField]);
    });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function resetForm() {
    setNewAddress("");
    setNewCity("");
    setNewPostalCode("");
    setNewDescription("");
    setNewOwnerId("");
    setError("");
    setGebouwDetails(null);
    setGebouwError(null);
    setShowCreate(false);
  }

  async function handleGebouwLookup() {
    const adresMatch = newAddress.trim().match(/^(.+?)\s+(\d+\w*)$/);
    const straat = adresMatch ? adresMatch[1] : newAddress.trim();
    const huisnummer = adresMatch ? adresMatch[2] : "";

    if (!straat || !huisnummer || !newPostalCode.trim() || !newCity.trim()) return;

    setGebouwLoading(true);
    setGebouwError(null);
    setGebouwDetails(null);

    try {
      const params = new URLSearchParams({
        straat,
        huisnummer,
        postcode: newPostalCode.trim(),
        stad: newCity.trim(),
      });

      const res = await fetch(`/api/basisregisters?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setGebouwError(data.error || "Fout bij ophalen gebouwgegevens");
        return;
      }

      if (!data.found) {
        setGebouwError("Adres niet gevonden in het Gebouwenregister — je kunt handmatig doorgaan");
        return;
      }

      setGebouwDetails(data.details);
    } catch {
      setGebouwError("Verbindingsfout met Basisregisters API — je kunt handmatig doorgaan");
    } finally {
      setGebouwLoading(false);
    }
  }

  async function handleCreateProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddress.trim() || !newCity.trim() || !newPostalCode.trim()) return;
    if (profile.role === "broker" && !newOwnerId) {
      setError("Selecteer een eigenaar voor dit pand.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const ownerId = profile.role === "broker" ? newOwnerId : user.id;

      const { data: property, error: insertError } = await supabase
        .from("properties")
        .insert({
          owner_id: ownerId,
          broker_id: profile.role === "broker" ? user.id : null,
          address: newAddress.trim(),
          city: newCity.trim(),
          postal_code: newPostalCode.trim(),
          description: newDescription.trim() || null,
          status: "new",
          ...(gebouwDetails && {
            gebouweenheid_id: gebouwDetails.gebouweenheidId,
            gebouw_id: gebouwDetails.gebouwId,
            perceel_id: gebouwDetails.perceelId,
            bouwjaar: gebouwDetails.bouwjaar,
            gebouw_status: gebouwDetails.status,
            oppervlakte: gebouwDetails.oppervlakte,
            verdiepingen: gebouwDetails.verdiepingen,
            basisregisters_synced_at: new Date().toISOString(),
          }),
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
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken op adres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-60"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PropertyStatus | "all")}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Alle statussen</option>
            {(Object.entries(PROPERTY_STATUS_LABELS) as [PropertyStatus, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {profile.role === "broker" && linkedOwners.length > 0 && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Alle eigenaars</option>
              {linkedOwners.map((o) => (
                <option key={o.id} value={o.id}>{o.full_name}</option>
              ))}
            </select>
          )}
          {(profile.role === "owner" || profile.role === "broker") && (
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
            {profile.role === "broker" && linkedOwners.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Eigenaar <span className="text-destructive">*</span>
                </Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  required
                >
                  <option value="">Selecteer eigenaar...</option>
                  {linkedOwners.map((o) => (
                    <option key={o.id} value={o.id}>{o.full_name} ({o.email})</option>
                  ))}
                </select>
              </div>
            )}
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
            {newAddress && newPostalCode && newCity && (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGebouwLookup}
                  disabled={gebouwLoading}
                  className="w-full"
                >
                  {gebouwLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Building2 className="w-4 h-4 mr-2" />
                  )}
                  Gebouwgegevens ophalen
                </Button>

                {gebouwError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <span className="text-xs text-blue-800">{gebouwError}</span>
                  </div>
                )}

                {gebouwDetails && (
                  <div className="p-3 rounded-lg border bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        OVAM-koppeling
                      </span>
                      {gebouwDetails.bouwjaar && gebouwDetails.bouwjaar < 2001 ? (
                        <Badge variant="warning" className="text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Asbestattest verplicht (OVAM)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          Geen attestplicht
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Gebouweenheid:</span>{" "}
                        <span className="font-mono">{gebouwDetails.gebouweenheidId}</span>
                      </div>
                      {gebouwDetails.bouwjaar && (
                        <div>
                          <span className="text-muted-foreground">Bouwjaar:</span>{" "}
                          <span className="font-medium">{gebouwDetails.bouwjaar}</span>
                        </div>
                      )}
                      {gebouwDetails.status && (
                        <div>
                          <span className="text-muted-foreground">Status:</span>{" "}
                          <span className="font-medium capitalize">{gebouwDetails.status}</span>
                        </div>
                      )}
                      {gebouwDetails.perceelId && (
                        <div>
                          <span className="text-muted-foreground">Perceel:</span>{" "}
                          <span className="font-mono">{gebouwDetails.perceelId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
            <button onClick={() => toggleSort("address")} className="text-left hover:text-foreground transition-colors">
              Adres {sortField === "address" && (sortDir === "asc" ? "↑" : "↓")}
            </button>
            <button onClick={() => toggleSort("city")} className="text-left hover:text-foreground transition-colors">
              Gemeente {sortField === "city" && (sortDir === "asc" ? "↑" : "↓")}
            </button>
            <button onClick={() => toggleSort("status")} className="text-left hover:text-foreground transition-colors">
              Status {sortField === "status" && (sortDir === "asc" ? "↑" : "↓")}
            </button>
            <button onClick={() => toggleSort("created_at")} className="text-left hover:text-foreground transition-colors">
              Datum {sortField === "created_at" && (sortDir === "asc" ? "↑" : "↓")}
            </button>
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
