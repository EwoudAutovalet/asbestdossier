"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { notify } from "@/lib/notifications";
import {
  UserPlus,
  Users,
  Building2,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Profile, Property, BrokerOwner } from "@/lib/types";
import { BROKER_OWNER_STATUS_LABELS, PROPERTY_STATUS_LABELS } from "@/lib/types";

interface EigenaarsContentProps {
  profile: Profile;
  brokerOwners: (BrokerOwner & { owner: Profile })[];
  properties: (Property & { owner: Profile })[];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function EigenaarsContent({ profile, brokerOwners, properties }: EigenaarsContentProps) {
  const router = useRouter();
  const supabase = createClient();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const activeOwners = brokerOwners.filter((bo) => bo.status === "active");
  const pendingOwners = brokerOwners.filter((bo) => bo.status === "invited");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");

    try {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", inviteEmail.trim())
        .eq("role", "owner")
        .single();

      if (!ownerProfile) {
        setInviteError("Geen eigenaar gevonden met dit e-mailadres. De eigenaar moet eerst een account aanmaken.");
        setInviting(false);
        return;
      }

      const existing = brokerOwners.find((bo) => bo.owner_id === ownerProfile.id);
      if (existing) {
        setInviteError("Deze eigenaar is al gekoppeld of uitgenodigd.");
        setInviting(false);
        return;
      }

      const { error: insertError } = await supabase.from("broker_owners").insert({
        broker_id: profile.id,
        owner_id: ownerProfile.id,
        status: "invited",
        invited_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      await notify({
        supabase,
        userId: ownerProfile.id,
        type: "broker_invitation",
        title: "Uitnodiging van makelaar",
        body: `${profile.full_name} (${profile.company_name || ""}) wil uw panden beheren.`,
        link: "/profiel",
      });

      setShowInvite(false);
      setInviteEmail("");
      router.refresh();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(brokerId: string) {
    await supabase
      .from("broker_owners")
      .update({ status: "revoked" })
      .eq("id", brokerId);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Mijn eigenaars</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer gekoppelde eigenaars en hun panden
          </p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Eigenaar uitnodigen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold font-mono">{activeOwners.length}</div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Actieve eigenaars
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold font-mono">{pendingOwners.length}</div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Uitnodigingen
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold font-mono">{properties.length}</div>
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              Totaal panden
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owners list */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Gekoppelde eigenaars
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {brokerOwners.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Nog geen eigenaars gekoppeld. Nodig een eigenaar uit om te beginnen.
            </div>
          ) : (
            brokerOwners.map((bo) => (
              <div key={bo.id} className="flex items-center gap-4 px-5 py-3 border-t">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(bo.owner.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{bo.owner.full_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {bo.owner.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      bo.status === "active" ? "success" :
                      bo.status === "invited" ? "warning" : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {BROKER_OWNER_STATUS_LABELS[bo.status]}
                  </Badge>
                  {bo.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive h-7"
                      onClick={() => handleRevoke(bo.id)}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Ontkoppelen
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Properties of linked owners */}
      {properties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Panden van eigenaars
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {properties.map((prop) => (
              <div
                key={prop.id}
                className="flex items-center gap-4 px-5 py-3 border-t cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/dossiers/${prop.id}`)}
              >
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{prop.address}</div>
                  <div className="text-xs text-muted-foreground">
                    {prop.postal_code} {prop.city} — {prop.owner.full_name}
                  </div>
                </div>
                <Badge variant={
                  prop.status === "cleared" ? "success" :
                  prop.status === "remediation" ? "purple" :
                  prop.status === "inspection" ? "info" : "warning"
                } className="text-[10px]">
                  {PROPERTY_STATUS_LABELS[prop.status]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={(open) => { if (!open) { setShowInvite(false); setInviteEmail(""); setInviteError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eigenaar uitnodigen</DialogTitle>
            <DialogDescription>
              Voer het e-mailadres in van de eigenaar die u wilt koppelen aan uw account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>E-mailadres eigenaar <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                placeholder="eigenaar@voorbeeld.be"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowInvite(false); setInviteEmail(""); setInviteError(""); }}>
                Annuleren
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uitnodigen...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />Uitnodiging versturen</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
