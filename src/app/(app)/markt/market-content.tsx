"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  MapPin,
  Calendar,
  Euro,
  Clock,
  Eye,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  Profile,
  MarketplaceRequestWithBids,
  MarketplaceBidWithSpecialist,
} from "@/lib/types";
import {
  MARKETPLACE_WORK_TYPE_LABELS,
  MARKETPLACE_URGENCY_LABELS,
  MARKETPLACE_REQUEST_STATUS_LABELS,
  MARKETPLACE_BID_STATUS_LABELS,
} from "@/lib/types";

interface MarketContentProps {
  profile: Profile;
  openRequests?: MarketplaceRequestWithBids[];
  ownBids?: MarketplaceBidWithSpecialist[];
  myRequests?: MarketplaceRequestWithBids[];
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Zojuist";
  if (diff < 3600) return `${Math.floor(diff / 60)}m geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}u geleden`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d geleden`;
  return new Date(dateStr).toLocaleDateString("nl-BE", { day: "numeric", month: "short" });
}

export function MarketContent({ profile, openRequests = [], ownBids = [], myRequests = [] }: MarketContentProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [filterWorkType, setFilterWorkType] = useState<string>("all");

  const isSpecialist = profile.role === "specialist";

  const ownBidByRequest = useMemo(() => {
    const map: Record<string, MarketplaceBidWithSpecialist> = {};
    ownBids.forEach((b) => { map[b.request_id] = b; });
    return map;
  }, [ownBids]);

  const filteredRequests = useMemo(() => {
    if (!isSpecialist) return [];
    return openRequests.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) &&
            !r.postal_code.includes(q) &&
            !r.city.toLowerCase().includes(q)) return false;
      }
      if (filterUrgency !== "all" && r.urgency !== filterUrgency) return false;
      if (filterWorkType !== "all" && r.work_type !== filterWorkType) return false;
      return true;
    });
  }, [openRequests, search, filterUrgency, filterWorkType, isSpecialist]);

  if (isSpecialist) {
    return (
      <>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-primary" />
              Marktplaats
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Open aanvragen van eigenaars — plaats een bod om opdrachten binnen te halen
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div>
              <div className="text-2xl font-bold font-mono">{filteredRequests.length}</div>
              <div className="text-xs text-muted-foreground">Open aanvragen</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-mono text-primary">
                {ownBids.filter((b) => b.status === "submitted").length}
              </div>
              <div className="text-xs text-muted-foreground">Eigen open biedingen</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-5">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op titel, postcode, stad..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
            >
              <option value="all">Alle urgenties</option>
              <option value="urgent">Dringend</option>
              <option value="soon">Binnen weken</option>
              <option value="flexible">Flexibel</option>
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value)}
            >
              <option value="all">Alle werktypes</option>
              <option value="inspection">Inspectie</option>
              <option value="removal">Verwijdering</option>
              <option value="full">Volledig traject</option>
              <option value="other">Andere</option>
            </select>
          </CardContent>
        </Card>

        {/* Requests grid */}
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">Geen open aanvragen gevonden</p>
              <p className="text-xs">Pas je filters aan of kom later terug.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((req) => {
              const myBid = ownBidByRequest[req.id];
              return (
                <Card
                  key={req.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/markt/${req.id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm leading-tight">{req.title}</h3>
                      {req.urgency === "urgent" && (
                        <Badge variant="destructive" className="text-[10px] shrink-0">Dringend</Badge>
                      )}
                      {req.urgency === "soon" && (
                        <Badge variant="warning" className="text-[10px] shrink-0">Binnen weken</Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {req.postal_code} {req.city}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" />
                        {MARKETPLACE_WORK_TYPE_LABELS[req.work_type]}
                      </div>
                      {req.bouwjaar && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          Bouwjaar {req.bouwjaar}
                        </div>
                      )}
                      {req.deadline && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Deadline: {new Date(req.deadline).toLocaleDateString("nl-BE", { day: "numeric", month: "short" })}
                        </div>
                      )}
                    </div>

                    {req.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 border-l-2 border-muted pl-2">
                        {req.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(req.created_at)}
                      </span>
                      {myBid ? (
                        <Badge variant={
                          myBid.status === "accepted" ? "success" :
                          myBid.status === "rejected" ? "destructive" :
                          myBid.status === "withdrawn" ? "secondary" : "info"
                        } className="text-[10px]">
                          {myBid.status === "submitted" ? `Bod €${myBid.amount.toLocaleString("nl-BE")}` : MARKETPLACE_BID_STATUS_LABELS[myBid.status]}
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          <Eye className="w-3 h-3 mr-1" />
                          Bekijken
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Eigen historie */}
        {ownBids.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Mijn biedingen</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ownBids.map((bid) => (
                <div
                  key={bid.id}
                  className="flex items-center gap-3 px-5 py-3 border-t hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/markt/${bid.request_id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">€{bid.amount.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}</div>
                    <div className="text-xs text-muted-foreground">{timeAgo(bid.created_at)}</div>
                  </div>
                  <Badge variant={
                    bid.status === "accepted" ? "success" :
                    bid.status === "rejected" ? "destructive" :
                    bid.status === "withdrawn" ? "secondary" : "info"
                  } className="text-[10px]">
                    {MARKETPLACE_BID_STATUS_LABELS[bid.status]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  // Owner / Broker view
  const openMine = myRequests.filter((r) => r.status === "open");
  const closedMine = myRequests.filter((r) => r.status !== "open");

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            Marktplaats
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Plaats een aanvraag en laat specialisten op jouw opdracht bieden
          </p>
        </div>
        <Button onClick={() => router.push("/markt/nieuw")}>
          <Plus className="w-4 h-4 mr-1.5" />
          Nieuwe aanvraag
        </Button>
      </div>

      {myRequests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">Nog geen aanvragen geplaatst</p>
            <p className="text-xs mb-4">Plaats een aanvraag om biedingen van specialisten te ontvangen.</p>
            <Button size="sm" onClick={() => router.push("/markt/nieuw")}>
              <Plus className="w-4 h-4 mr-1.5" />
              Eerste aanvraag plaatsen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {openMine.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                Open aanvragen ({openMine.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openMine.map((req) => (
                  <RequestCard key={req.id} request={req} onClick={() => router.push(`/markt/${req.id}`)} />
                ))}
              </div>
            </div>
          )}

          {closedMine.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                Afgehandeld ({closedMine.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {closedMine.map((req) => (
                  <RequestCard key={req.id} request={req} onClick={() => router.push(`/markt/${req.id}`)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function RequestCard({ request, onClick }: { request: MarketplaceRequestWithBids; onClick: () => void }) {
  const submittedBids = (request.bids || []).filter((b) => b.status === "submitted");
  const acceptedBid = (request.bids || []).find((b) => b.status === "accepted");
  const minBid = submittedBids.length > 0 ? Math.min(...submittedBids.map((b) => b.amount)) : null;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{request.title}</h3>
          <Badge variant={
            request.status === "open" ? "info" :
            request.status === "closed" ? "success" : "secondary"
          } className="text-[10px] shrink-0">
            {MARKETPLACE_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {request.postal_code} {request.city}
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3" />
            {MARKETPLACE_WORK_TYPE_LABELS[request.work_type]} — {MARKETPLACE_URGENCY_LABELS[request.urgency]}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          {request.status === "open" ? (
            submittedBids.length > 0 ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-primary">
                  {submittedBids.length} bod{submittedBids.length !== 1 ? "den" : ""}
                </span>
                {minBid !== null && (
                  <span className="text-muted-foreground font-mono">
                    vanaf €{minBid.toLocaleString("nl-BE", { minimumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Nog geen biedingen</span>
            )
          ) : acceptedBid ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              Aanvaard: €{acceptedBid.amount.toLocaleString("nl-BE")}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Geen aanvaarding</span>
          )}
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
