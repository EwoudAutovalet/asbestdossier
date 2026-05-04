import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { NewRequestForm } from "./new-request-form";
import type { Profile, Property } from "@/lib/types";

export default async function NewMarketRequestPage() {
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

  if (typedProfile.role === "specialist") redirect("/markt");

  let properties: Property[] = [];
  if (typedProfile.role === "owner") {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", user.id)
      .order("address");
    properties = (data || []) as Property[];
  } else if (typedProfile.role === "broker") {
    const { data: bo } = await supabase
      .from("broker_owners")
      .select("owner_id")
      .eq("broker_id", user.id)
      .eq("status", "active");
    const ownerIds = (bo || []).map((b) => b.owner_id);
    if (ownerIds.length > 0) {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .in("owner_id", ownerIds)
        .order("address");
      properties = (data || []) as Property[];
    }
  }

  return <NewRequestForm profile={typedProfile} properties={properties} />;
}
