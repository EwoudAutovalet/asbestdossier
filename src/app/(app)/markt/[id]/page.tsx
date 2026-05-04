import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { RequestDetail } from "./request-detail";
import type {
  Profile,
  MarketplaceRequest,
  MarketplaceBidWithSpecialist,
  Property,
} from "@/lib/types";

export default async function MarketRequestPage({ params }: { params: { id: string } }) {
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

  const { data: request } = await supabase
    .from("marketplace_requests")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!request) notFound();

  const typedRequest = request as MarketplaceRequest;

  // Determine if this caller is the owner (or broker) of the request
  let isOwnerSide = false;
  if (typedProfile.role === "owner" && typedRequest.owner_id === user.id) {
    isOwnerSide = true;
  } else if (typedProfile.role === "broker") {
    const { data: bo } = await supabase
      .from("broker_owners")
      .select("id")
      .eq("broker_id", user.id)
      .eq("owner_id", typedRequest.owner_id)
      .eq("status", "active")
      .maybeSingle();
    isOwnerSide = !!bo;
  }

  // For owner side: load all bids
  let bids: MarketplaceBidWithSpecialist[] = [];
  if (isOwnerSide) {
    const { data } = await supabase
      .from("marketplace_bids")
      .select("*, specialist:profiles!marketplace_bids_specialist_id_fkey(*)")
      .eq("request_id", params.id)
      .order("amount", { ascending: true });
    bids = (data || []) as MarketplaceBidWithSpecialist[];
  }

  // For specialist side: load their own bid (if any)
  let myBid: MarketplaceBidWithSpecialist | null = null;
  if (typedProfile.role === "specialist") {
    const { data } = await supabase
      .from("marketplace_bids")
      .select("*, specialist:profiles!marketplace_bids_specialist_id_fkey(*)")
      .eq("request_id", params.id)
      .eq("specialist_id", user.id)
      .maybeSingle();
    myBid = (data || null) as MarketplaceBidWithSpecialist | null;
  }

  // Owner side: also expose the property (full address)
  let property: Property | null = null;
  if (isOwnerSide) {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("id", typedRequest.property_id)
      .single();
    property = (data || null) as Property | null;
  }

  return (
    <RequestDetail
      profile={typedProfile}
      request={typedRequest}
      isOwnerSide={isOwnerSide}
      bids={bids}
      myBid={myBid}
      property={property}
    />
  );
}
