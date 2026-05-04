import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EigenaarsContent } from "./eigenaars-content";
import type { Profile, Property, BrokerOwner } from "@/lib/types";

export default async function EigenaarsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "broker") redirect("/dashboard");

  const { data: brokerOwners } = await supabase
    .from("broker_owners")
    .select("*, owner:profiles!broker_owners_owner_id_fkey(*)")
    .eq("broker_id", user.id)
    .order("created_at", { ascending: false });

  const activeOwnerIds = (brokerOwners || [])
    .filter((bo) => bo.status === "active")
    .map((bo) => bo.owner_id);

  let properties: (Property & { owner: Profile })[] = [];
  if (activeOwnerIds.length > 0) {
    const { data } = await supabase
      .from("properties")
      .select("*, owner:profiles!properties_owner_id_fkey(*)")
      .in("owner_id", activeOwnerIds)
      .order("created_at", { ascending: false });
    properties = (data || []) as typeof properties;
  }

  return (
    <EigenaarsContent
      profile={profile as Profile}
      brokerOwners={(brokerOwners || []) as (BrokerOwner & { owner: Profile })[]}
      properties={properties}
    />
  );
}
