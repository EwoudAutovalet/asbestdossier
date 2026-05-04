"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft,
  Store,
  MapPin,
  Calendar,
  Building2,
  Clock,
  Euro,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Award,
  User,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Profile,
  MarketplaceRequest,
  MarketplaceBidWithSpecialist,
  Property,
} from "@/lib/types";
import {
  MARKETPLACE_WORK_TYPE_LABELS,
  MARKETPLACE_URGENCY_LABELS,
  MARKETPLACE_REQUEST_STATUS_LABELS,
  MARKETPLACE_BID_STATUS_LABELS,
} from "@/lib/types";
import { notify } from "@/lib/notifications";

interface RequestDetailProps {
  profile: Profile;
  request: MarketplaceRequest;
  isOwnerSide: boolean;
  bids: MarketplaceBidWithSpecialist[];
  myBid: MarketplaceBidWithSpecialist | null;
  property: Property | null;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function RequestDetail({ profile, request, isOwnerSide, bids, myBid, property }: RequestDetailProps) {
  const router = useRouter();
  const supabase = createClient();

  const [showBidForm, setShowBidForm] = useState(false);
  const [bidAmount, setBidAmount] = useState(myBid ? String(myBid.amount) : "");
  const [bidMessage, setBidMessage] = useState(myBid?.message || "");
  const [bidValidUntil, setBidValidUntil] = useState(myBid?.valid_until?.slice(0, 10) || "");
  const [bidDuration, setBidDuration] = useState(myBid?.estimated_duration_days ? String(myBid.estimated_duration_days) : "");
  const [submitting, setSubmitting] = useState(false);

  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [rejectingBidId, setRejectingBidId] = useState<string | null>(null);
  const [confirmAccept, setConfirmAccept] = useState<MarketplaceBidWithSpecialist | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function handleSubmitBid(e: React.FormEvent) {
    e.preventDefault();
    if (!bidAmount) return;
    setSubmitting(true);
    try {
      const amount = parseFloat(bidAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Ongeldig bedrag");

      if (myBid) {
        const { error } = await supabase
          .from("marketplace_bids")
          .update({
            amount,
            message: bidMessage.trim() || null,
            valid_until: bidValidUntil || null,
            estimated_duration_days: bidDuration ? parseInt(bidDuration) : null,
          })
          .eq("id", myBid.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketplace_bids")
          .insert({
            request_id: request.id,
            specialist_id: profile.id,
            amount,
            message: bidMessage.trim() || null,
            valid_until: bidValidUntil || null,
            estimated_duration_days: bidDuration ? parseInt(bidDuration) : null,
            status: "submitted",
          });
        if (error) throw error;

        await notify({
          supabase,
          userId: request.owner_id,
          type: "marketplace_bid_received",
          title: "Nieuw bod op je marktplaats-aanvraag",
          body: `${profile.company_name || profile.full_name} bood €${amount.toLocaleString("nl-BE", { minimumFractionDigits: 2 })} op "${request.title}"`,
          link: `/markt/${request.id}`,
          metadata: { request_id: request.id, amount },
        });
      }

      toast({
        title: myBid ? "Bod bijgewerkt" : "Bod ingediend",
        description: "De eigenaar wordt op de hoogte gebracht.",
        variant: "success",
      });
      setShowBidForm(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Fout", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdrawBid() {
    if (!myBid) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("marketplace_bids")
        .update({ status: "withdrawn" })
        .eq("id", myBid.id);
      if (error) throw error;
      toast({ title: "Bod ingetrokken", variant: "success" });
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Fout", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptBid(bid: MarketplaceBidWithSpecialist) {
    setAcceptingBidId(bid.id);
    try {
      const { data: jobId, error } = await supabase.rpc("accept_marketplace_bid", { bid_id: bid.id });
      if (error) throw error;

      // Notifications: accept to winner, reject to others
      await notify({
        supabase,
        userId: bid.specialist_id,
        type: "marketplace_bid_accepted",
        title: "Je bod is aanvaard!",
        body: `Je bod van €${bid.amount.toLocaleString("nl-BE", { minimumFractionDigits: 2 })} op "${request.title}" is aanvaard.`,
        link: `/dossiers/${request.property_id}`,
        metadata: { request_id: request.id, bid_id: bid.id, job_id: jobId },
      });

      const otherBids = bids.filter((b) => b.id !== bid.id && b.status === "submitted");
      for (const other of otherBids) {
        await notify({
          supabase,
          userId: other.specialist_id,
          type: "marketplace_bid_rejected",
          title: "Je bod is niet geselecteerd",
          body: `De eigenaar heeft een ander bod aanvaard voor "${request.title}".`,
          link: `/markt`,
          metadata: { request_id: request.id, bid_id: other.id },
        });
      }

      toast({
        title: "Bod aanvaard",
        description: "De opdracht is automatisch aangemaakt. Andere biedingen zijn afgewezen.",
        variant: "success",
      });
      setConfirmAccept(null);
      router.push(`/dossiers/${request.property_id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Fout bij aanvaarden", description: message, variant: "destructive" });
    } finally {
      setAcceptingBidId(null);
    }
  }

  async function handleRejectBid(bid: MarketplaceBidWithSpecialist) {
    setRejectingBidId(bid.id);
    try {
      const { error } = await supabase
        .from("marketplace_bids")
        .update({ status: "rejected" })
        .eq("id", bid.id);
      if (error) throw error;

      await notify({
        supabase,
        userId: bid.specialist_id,
        type: "marketplace_bid_rejected",
        title: "Je bod is afgewezen",
        body: `Je bod op "${request.title}" is afgewezen.`,
        link: `/markt`,
        metadata: { request_id: request.id, bid_id: bid.id },
      });

      toast({ title: "Bod afgewezen", variant: "default" });
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Fout", description: message, variant: "destructive" });
    } finally {
      setRejectingBidId(null);
    }
  }

  async function handleCancelRequest() {
    if (!confirm("Weet je zeker dat je deze aanvraag wilt annuleren? Open biedingen worden afgewezen.")) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("marketplace_requests")
        .update({ status: "cancelled", closed_at: new Date().toISOString() })
        .eq("id", request.id);
      if (error) throw error;

      // Reject all submitted bids
      await supabase
        .from("marketplace_bids")
        .update({ status: "rejected" })
        .eq("request_id", request.id)
        .eq("status", "submitted");

      // Notify bidders
      const submittedBids = bids.filter((b) => b.status === "submitted");
      for (const bid of submittedBids) {
        await notify({
          supabase,
          userId: bid.specialist_id,
          type: "marketplace_bid_rejected",
          title: "Aanvraag geannuleerd",
          body: `De aanvraag "${request.title}" is geannuleerd door de eigenaar.`,
          link: `/markt`,
          metadata: { request_id: request.id },
        });
      }

      toast({ title: "Aanvraag geannuleerd", variant: "success" });
      router.push("/markt");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Fout", description: message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  }

  const isSpecialist = profile.role === "specialist";
  const submittedBids = bids.filter((b) => b.status === "submitted");
  const acceptedBid = bids.find((b) => b.status === "accepted");
  const sortedBids = [...bids].sort((a, b) => {
    if (a.status === "accepted") return -1;
    if (b.status === "accepted") return 1;
    return a.amount - b.amount;
  });

  return (
    <>
      <div className="flex items-center gap-2 mb-5 text-sm">
        <Button variant="ghost" size="sm" onClick={() => router.push("/markt")} className="text-primary">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Marktplaats
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground font-mono text-xs">{request.title}</span>
      </div>

      {/* Request header */}
      <Card className="mb-5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight mb-1">{request.title}</h1>
              <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                <Badge variant={
                  request.status === "open" ? "info" :
                  request.status === "closed" ? "success" : "secondary"
                }>
                  {MARKETPLACE_REQUEST_STATUS_LABELS[request.status]}
                </Badge>
                {request.urgency === "urgent" && <Badge variant="destructive">Dringend</Badge>}
                {request.urgency === "soon" && <Badge variant="warning">Binnen weken</Badge>}
              </div>
            </div>
            {isOwnerSide && request.status === "open" && (
              <Button variant="outline" size="sm" onClick={handleCancelRequest} disabled={cancelling} className="text-destructive">
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                Aanvraag annuleren
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Locatie</div>
              <div className="font-semibold flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                {isOwnerSide && property ? `${property.address}, ` : ""}{request.postal_code} {request.city}
              </div>
              {!isOwnerSide && (
                <p className="text-[10px] text-muted-foreground mt-0.5 italic">Volledig adres bij aanvaarding</p>
              )}
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Type werk</div>
              <div className="font-semibold flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                {MARKETPLACE_WORK_TYPE_LABELS[request.work_type]}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Urgentie</div>
              <div className="font-semibold flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                {MARKETPLACE_URGENCY_LABELS[request.urgency]}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Deadline</div>
              <div className="font-semibold flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {request.deadline
                  ? new Date(request.deadline).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" })
                  : "Geen deadline"}
              </div>
            </div>
            {request.bouwjaar && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Bouwjaar</div>
                <div className="font-semibold mt-1">{request.bouwjaar}</div>
              </div>
            )}
            {request.oppervlakte && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Oppervlakte</div>
                <div className="font-semibold mt-1">{request.oppervlakte} m²</div>
              </div>
            )}
            {request.budget_indication && (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Budget indicatie</div>
                <div className="font-semibold mt-1 font-mono">€{request.budget_indication.toLocaleString("nl-BE")}</div>
              </div>
            )}
          </div>

          {request.description && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1.5">Omschrijving</div>
              <p className="text-sm whitespace-pre-wrap">{request.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Specialist: bid form */}
      {isSpecialist && request.status === "open" && (
        <Card className="mb-5 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              {myBid ? "Je bod" : "Plaats een bod"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myBid && !showBidForm ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                  <div>
                    <div className="text-xl font-bold font-mono">€{myBid.amount.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}</div>
                    <Badge variant={
                      myBid.status === "accepted" ? "success" :
                      myBid.status === "rejected" ? "destructive" :
                      myBid.status === "withdrawn" ? "secondary" : "info"
                    } className="text-[10px] mt-1">
                      {MARKETPLACE_BID_STATUS_LABELS[myBid.status]}
                    </Badge>
                  </div>
                  {myBid.status === "submitted" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowBidForm(true)}>
                        Aanpassen
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleWithdrawBid} disabled={submitting} className="text-destructive">
                        Intrekken
                      </Button>
                    </div>
                  )}
                </div>
                {myBid.message && (
                  <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
                    <span className="font-semibold">Bericht:</span> {myBid.message}
                  </div>
                )}
                {myBid.valid_until && (
                  <p className="text-xs text-muted-foreground">
                    Geldig tot {new Date(myBid.valid_until).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitBid} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Bedrag (incl. btw) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="pl-9 font-mono"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Geschatte duur (dagen)</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Bijv. 3"
                      value={bidDuration}
                      onChange={(e) => setBidDuration(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Geldig tot (optioneel)</Label>
                  <Input type="date" value={bidValidUntil} onChange={(e) => setBidValidUntil(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bericht aan eigenaar</Label>
                  <Textarea
                    placeholder="Korte uitleg over je aanpak, ervaring met dit type werk, beschikbaarheid..."
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  {myBid && (
                    <Button type="button" variant="ghost" onClick={() => setShowBidForm(false)}>
                      Annuleren
                    </Button>
                  )}
                  <Button type="submit" disabled={submitting || !bidAmount} className="flex-1">
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Indienen...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />{myBid ? "Bod bijwerken" : "Bod indienen"}</>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Owner side: bids list */}
      {isOwnerSide && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Biedingen ({bids.length})
              </span>
              {request.status === "open" && submittedBids.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  Sorteer op prijs (laagste eerst)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {bids.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nog geen biedingen</p>
                <p className="text-xs">Specialisten worden bij het plaatsen op de hoogte gebracht.</p>
              </div>
            ) : (
              <div>
                {sortedBids.map((bid, idx) => {
                  const isLowest = idx === 0 && bid.status === "submitted" && submittedBids.length > 1;
                  const isAccepted = bid.status === "accepted";

                  return (
                    <div
                      key={bid.id}
                      className={`flex items-start gap-4 px-5 py-4 border-t ${
                        isAccepted ? "bg-green-50/50" : ""
                      }`}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {getInitials(bid.specialist.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-bold text-base font-mono">
                            €{bid.amount.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-sm font-medium">
                            {bid.specialist.company_name || bid.specialist.full_name}
                          </span>
                          {isLowest && <Badge variant="success" className="text-[10px]">Laagste bod</Badge>}
                          {isAccepted && (
                            <Badge variant="success" className="text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Aanvaard
                            </Badge>
                          )}
                          {bid.status === "rejected" && (
                            <Badge variant="destructive" className="text-[10px]">Afgewezen</Badge>
                          )}
                          {bid.status === "withdrawn" && (
                            <Badge variant="secondary" className="text-[10px]">Ingetrokken</Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          {bid.estimated_duration_days && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {bid.estimated_duration_days} dag{bid.estimated_duration_days !== 1 ? "en" : ""}
                            </span>
                          )}
                          {bid.valid_until && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Geldig tot {new Date(bid.valid_until).toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {bid.specialist.company_address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {bid.specialist.company_address}
                            </span>
                          )}
                        </div>

                        {bid.message && (
                          <div className="mt-2 p-2.5 rounded-md bg-muted/30 text-xs">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                              <p className="whitespace-pre-wrap">{bid.message}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {request.status === "open" && bid.status === "submitted" && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => setConfirmAccept(bid)}
                            disabled={!!acceptingBidId}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Aanvaarden
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRejectBid(bid)}
                            disabled={rejectingBidId === bid.id}
                            className="text-destructive text-xs"
                          >
                            {rejectingBidId === bid.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Afwijzen"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Closed status hint for specialist */}
      {isSpecialist && request.status !== "open" && (
        <Card className="mt-5 bg-muted/30">
          <CardContent className="p-4 text-sm text-center text-muted-foreground">
            Deze aanvraag is {request.status === "closed" ? "afgerond" : "geannuleerd"} en accepteert geen nieuwe biedingen.
          </CardContent>
        </Card>
      )}

      {/* Confirm accept dialog */}
      <Dialog open={!!confirmAccept} onOpenChange={(o) => !o && setConfirmAccept(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bod aanvaarden</DialogTitle>
            <DialogDescription>
              Door dit bod te aanvaarden:
              <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
                <li>Wordt automatisch een opdracht aangemaakt met <strong>{confirmAccept?.specialist.company_name || confirmAccept?.specialist.full_name}</strong></li>
                <li>Krijgt deze specialist toegang tot het volledige adres en het dossier</li>
                <li>Worden alle andere biedingen automatisch afgewezen</li>
                <li>Wordt de aanvraag gesloten</li>
              </ul>
              <p className="mt-3 font-semibold">
                Bedrag: €{confirmAccept?.amount.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAccept(null)}>Annuleren</Button>
            <Button
              onClick={() => confirmAccept && handleAcceptBid(confirmAccept)}
              disabled={!!acceptingBidId}
              className="bg-green-600 hover:bg-green-700"
            >
              {acceptingBidId ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Bezig...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Definitief aanvaarden</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
