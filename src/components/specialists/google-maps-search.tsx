"use client";

import { useState, useCallback } from "react";
import {
  Search,
  MapPin,
  Star,
  Phone,
  Globe,
  ExternalLink,
  Loader2,
  Navigation,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  total_ratings: number;
  open_now: boolean | null;
  business_status: string | null;
  photo_ref: string | null;
}

interface PlaceDetails {
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  google_maps_url: string | null;
  rating: number | null;
  total_ratings: number;
  open_now: boolean | null;
  weekday_hours: string[];
  reviews: {
    author: string;
    rating: number;
    text: string;
    time: string;
  }[];
}

export function GoogleMapsSearch() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PlaceDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const searchPlaces = useCallback(
    async (overrideLat?: number, overrideLng?: number) => {
      setSearching(true);
      setSearched(true);
      setExpandedId(null);

      try {
        const params = new URLSearchParams();
        params.set("query", query || "asbest verwijdering specialist");
        if (location) params.set("location", location);
        if (overrideLat !== undefined && overrideLng !== undefined) {
          params.set("lat", String(overrideLat));
          params.set("lng", String(overrideLng));
        }

        const res = await fetch(`/api/places?${params.toString()}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [query, location]
  );

  function handleGeoSearch() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        searchPlaces(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGeoLoading(false);
        searchPlaces();
      }
    );
  }

  async function toggleDetails(placeId: string) {
    if (expandedId === placeId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(placeId);

    if (!details[placeId]) {
      setLoadingDetails(placeId);
      try {
        const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(placeId)}`);
        const data = await res.json();
        if (!data.error) {
          setDetails((prev) => ({ ...prev, [placeId]: data }));
        }
      } catch {
        // ignore
      } finally {
        setLoadingDetails(null);
      }
    }
  }

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) {
        stars.push(
          <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        );
      } else if (i === full && half) {
        stars.push(
          <Star key={i} className="w-3.5 h-3.5 fill-yellow-400/50 text-yellow-400" />
        );
      } else {
        stars.push(
          <Star key={i} className="w-3.5 h-3.5 text-muted-foreground/30" />
        );
      }
    }
    return stars;
  }

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Zoek specialist via Google Maps</h3>
              <p className="text-xs text-muted-foreground">
                Vind asbestverwijderaars bij jou in de buurt
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchPlaces();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Bijv. asbestverwijdering, sanering..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Stad of postcode, bijv. Antwerpen, 2000..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={searching} className="flex-1 md:flex-none">
                {searching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Zoeken
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGeoSearch}
                disabled={searching || geoLoading}
              >
                {geoLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4 mr-2" />
                )}
                In mijn buurt
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {searching && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          Zoeken naar specialisten...
        </div>
      )}

      {!searching && searched && results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">Geen resultaten gevonden</p>
            <p className="text-xs">
              Probeer een andere zoekterm of locatie, of zoek in een breder gebied.
            </p>
          </CardContent>
        </Card>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{results.length}</span> resultaten
            gevonden via Google Maps
          </div>

          {results.map((place) => {
            const isExpanded = expandedId === place.place_id;
            const detail = details[place.place_id];
            const isLoadingThis = loadingDetails === place.place_id;

            return (
              <Card
                key={place.place_id}
                className={`transition-shadow ${isExpanded ? "shadow-md border-primary/30" : "hover:shadow-md"}`}
              >
                <CardContent className="p-0">
                  {/* Main Row */}
                  <button
                    onClick={() => toggleDetails(place.place_id)}
                    className="w-full text-left p-4 flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{place.name}</h4>
                        <div className="flex items-center gap-2 shrink-0">
                          {place.open_now !== null && (
                            <Badge
                              variant={place.open_now ? "success" : "secondary"}
                              className="text-[10px]"
                            >
                              {place.open_now ? "Open" : "Gesloten"}
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{place.address}</span>
                      </div>

                      {place.rating !== null && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex">{renderStars(place.rating)}</div>
                          <span className="text-xs font-semibold">{place.rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({place.total_ratings} reviews)
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <>
                      <Separator />
                      <div className="p-4">
                        {isLoadingThis ? (
                          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Details laden...
                          </div>
                        ) : detail ? (
                          <div className="space-y-4">
                            {/* Contact Info */}
                            <div className="flex flex-wrap gap-2">
                              {detail.phone && (
                                <Button variant="outline" size="sm" className="text-xs" asChild>
                                  <a href={`tel:${detail.phone}`}>
                                    <Phone className="w-3.5 h-3.5 mr-1.5" />
                                    {detail.phone}
                                  </a>
                                </Button>
                              )}
                              {detail.website && (
                                <Button variant="outline" size="sm" className="text-xs" asChild>
                                  <a
                                    href={detail.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Globe className="w-3.5 h-3.5 mr-1.5" />
                                    Website
                                  </a>
                                </Button>
                              )}
                              {detail.google_maps_url && (
                                <Button variant="outline" size="sm" className="text-xs" asChild>
                                  <a
                                    href={detail.google_maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                    Google Maps
                                  </a>
                                </Button>
                              )}
                            </div>

                            {/* Opening Hours */}
                            {detail.weekday_hours.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold mb-2">
                                  <Clock className="w-3.5 h-3.5" />
                                  Openingsuren
                                </div>
                                <div className="grid grid-cols-1 gap-0.5 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                                  {detail.weekday_hours.map((line, i) => (
                                    <div key={i}>{line}</div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Reviews */}
                            {detail.reviews.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold mb-2">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  Recente reviews
                                </div>
                                <div className="space-y-2">
                                  {detail.reviews.map((review, i) => (
                                    <div
                                      key={i}
                                      className="bg-muted/50 rounded-lg p-3"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold">
                                          {review.author}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <div className="flex">{renderStars(review.rating)}</div>
                                          <span className="text-[10px] text-muted-foreground">
                                            {review.time}
                                          </span>
                                        </div>
                                      </div>
                                      {review.text && (
                                        <p className="text-xs text-muted-foreground line-clamp-3">
                                          {review.text}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            Kon details niet laden.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
