import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { ProfielContent } from "./profiel-content";
import type { Profile, BrokerOwner } from "@/lib/types";

export default async function ProfielPage() {
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

  if (!profile) redirect("/login");

  let pendingInvitations: (BrokerOwner & { broker: Profile })[] = [];
  if (profile.role === "owner") {
    const { data } = await supabase
      .from("broker_owners")
      .select("*, broker:profiles!broker_owners_broker_id_fkey(*)")
      .eq("owner_id", user.id)
      .eq("status", "invited");
    pendingInvitations = (data || []) as typeof pendingInvitations;
  }

  return (
    <ProfielContent
      profile={profile as Profile}
      pendingInvitations={pendingInvitations}
    />
  );
}
