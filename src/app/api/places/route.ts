import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
  business_status?: string;
  photos?: { photo_reference: string }[];
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "asbest verwijdering";
  const location = searchParams.get("location") || "";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const searchQuery = `${query} ${location}`.trim();

  let url: string;

  if (lat && lng) {
    url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&radius=50000` +
      `&keyword=${encodeURIComponent(searchQuery)}` +
      `&type=general_contractor` +
      `&key=${GOOGLE_API_KEY}`;
  } else {
    url =
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${encodeURIComponent(searchQuery)}` +
      `&key=${GOOGLE_API_KEY}`;
  }

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: `Google API error: ${data.status}`, results: [] },
        { status: 502 }
      );
    }

    const results = (data.results || []).map((place: PlaceResult) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address || "",
      lat: place.geometry?.location.lat,
      lng: place.geometry?.location.lng,
      rating: place.rating || null,
      total_ratings: place.user_ratings_total || 0,
      open_now: place.opening_hours?.open_now ?? null,
      business_status: place.business_status || null,
      photo_ref: place.photos?.[0]?.photo_reference || null,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch places", results: [] },
      { status: 500 }
    );
  }
}
