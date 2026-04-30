import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");

  if (!placeId) {
    return NextResponse.json(
      { error: "place_id is required" },
      { status: 400 }
    );
  }

  const fields = [
    "name",
    "formatted_address",
    "formatted_phone_number",
    "international_phone_number",
    "website",
    "url",
    "rating",
    "user_ratings_total",
    "opening_hours",
    "reviews",
    "geometry",
    "photos",
    "business_status",
  ].join(",");

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=${fields}` +
    `&language=nl` +
    `&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    const data = await response.json();

    if (data.status !== "OK") {
      return NextResponse.json(
        { error: `Google API error: ${data.status}` },
        { status: 502 }
      );
    }

    const place = data.result;

    return NextResponse.json({
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || place.international_phone_number || null,
      website: place.website || null,
      google_maps_url: place.url || null,
      rating: place.rating || null,
      total_ratings: place.user_ratings_total || 0,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      open_now: place.opening_hours?.open_now ?? null,
      weekday_hours: place.opening_hours?.weekday_text || [],
      reviews: (place.reviews || []).slice(0, 3).map(
        (r: { author_name: string; rating: number; text: string; relative_time_description: string }) => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
          time: r.relative_time_description,
        })
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 500 }
    );
  }
}
