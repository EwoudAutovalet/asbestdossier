import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type {
  BasisregisterAdres,
  BasisregisterGebouweenheid,
  BasisregisterGebouw,
  GebouwDetails,
} from "@/lib/types";

const BASE_URL = "https://api.basisregisters.vlaanderen.be/v2";
const FETCH_TIMEOUT = 5000;
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 15;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

let lastExternalCall = 0;

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

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, 1000 - (now - lastExternalCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastExternalCall = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
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

  const { searchParams } = new URL(request.url);
  const straat = searchParams.get("straat");
  const huisnummer = searchParams.get("huisnummer");
  const postcode = searchParams.get("postcode");
  const stad = searchParams.get("stad");

  if (!straat || !huisnummer || !postcode || !stad) {
    return NextResponse.json(
      { error: "Parameters straat, huisnummer, postcode en stad zijn vereist" },
      { status: 400 }
    );
  }

  try {
    // Stap 1: Adresmatch
    const matchUrl =
      `${BASE_URL}/adresmatch?` +
      `gemeentenaam=${encodeURIComponent(stad)}` +
      `&straatnaam=${encodeURIComponent(straat)}` +
      `&huisnummer=${encodeURIComponent(huisnummer)}` +
      `&postcode=${encodeURIComponent(postcode)}`;

    const matchRes = await throttledFetch(matchUrl);
    if (!matchRes.ok) {
      return NextResponse.json(
        { error: `Basisregisters API fout: ${matchRes.status}` },
        { status: 502 }
      );
    }

    const matchData = await matchRes.json();
    const adresMatches: BasisregisterAdres[] = matchData.adresMatches || [];

    if (adresMatches.length === 0) {
      return NextResponse.json({
        found: false,
        message: "Geen adres gevonden in het Basisregisters Vlaanderen",
        details: null,
      });
    }

    const bestMatch = adresMatches[0];
    const gebouweenheidLinks = bestMatch.gebouweenheden || [];

    if (gebouweenheidLinks.length === 0) {
      return NextResponse.json({
        found: false,
        message: "Adres gevonden maar geen gekoppelde gebouweenheid",
        details: null,
      });
    }

    // Stap 2: Gebouweenheid ophalen
    const geUrl = gebouweenheidLinks[0];
    const geRes = await throttledFetch(geUrl);
    if (!geRes.ok) {
      return NextResponse.json(
        { error: `Gebouweenheid ophalen mislukt: ${geRes.status}` },
        { status: 502 }
      );
    }

    const geData: BasisregisterGebouweenheid = await geRes.json();
    const gebouweenheidId = geData.identificator.objectId;
    const gebouwDetailUrl = geData.gebouw.detail;

    // Stap 3: Gebouw ophalen
    const gbRes = await throttledFetch(gebouwDetailUrl);
    if (!gbRes.ok) {
      return NextResponse.json(
        { error: `Gebouw ophalen mislukt: ${gbRes.status}` },
        { status: 502 }
      );
    }

    const gbData: BasisregisterGebouw = await gbRes.json();
    const gebouwId = gbData.identificator.objectId;
    const gebouwStatus = gbData.status;

    // Stap 4: Perceel ophalen (optioneel, uit gebouw-data)
    let perceelId: string | null = null;
    if (gbData.perceelObjectIds && gbData.perceelObjectIds.length > 0) {
      perceelId = gbData.perceelObjectIds[0];
    } else {
      // Fallback: percelen endpoint via adresId
      const adresId = bestMatch.identificator.objectId;
      const perUrl = `${BASE_URL}/percelen?adresObjectId=${adresId}`;
      const perRes = await throttledFetch(perUrl);
      if (perRes.ok) {
        const perData = await perRes.json();
        const percelen = perData.percelen || [];
        if (percelen.length > 0) {
          perceelId = percelen[0].identificator?.objectId || null;
        }
      }
    }

    const details: GebouwDetails = {
      gebouweenheidId,
      gebouwId,
      perceelId,
      bouwjaar: null,
      status: gebouwStatus,
      oppervlakte: null,
      verdiepingen: null,
    };

    return NextResponse.json({ found: true, details });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Basisregisters API timeout (5s)" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Fout bij ophalen gebouwgegevens" },
      { status: 500 }
    );
  }
}
