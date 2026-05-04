import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { MarketContent } from "./market-content";
import type { Profile, MarketplaceRequestWithBids, MarketplaceBidWithSpecialist } from "@/lib/types";

export default async function MarketPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const typedProfile = profile as Profile;

  if (typedProfile.role === "specialist") {
    // Specialist sees: open requests + their own historic bids
    const { data: openRequests } = await supabase
      .from("marketplace_requests")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    const { data: ownBids } = await supabase
      .from("marketplace_bids")
      .select("*")
      .eq("specialist_id", user.id)
      .order("created_at", { ascending: false });

    return (
      <MarketContent
        profile={typedProfile}
        openRequests={(openRequests || []) as MarketplaceRequestWithBids[]}
        ownBids={(ownBids || []) as MarketplaceBidWithSpecialist[]}
      />
    );
  }

  // Owner / Broker view: own requests + bids
  let ownerIds: string[] = [user.id];
  if (typedProfile.role === "broker") {
    const { data: bo } = await supabase
      .from("broker_owners")
      .select("owner_id")
      .eq("broker_id", user.id)
      .eq("status", "active");
    ownerIds = (bo || []).map((b) => b.owner_id);
  }

  let myRequests: MarketplaceRequestWithBids[] = [];
  if (ownerIds.length > 0) {
    const { data } = await supabase
      .from("marketplace_requests")
      .select("*, bids:marketplace_bids(*, specialist:profiles!marketplace_bids_specialist_id_fkey(*))")
      .in("owner_id", ownerIds)
      .order("created_at", { ascending: false });
    myRequests = (data || []) as MarketplaceRequestWithBids[];
  }

  return (
    <MarketContent
      profile={typedProfile}
      myRequests={myRequests}
    />
  );
}
