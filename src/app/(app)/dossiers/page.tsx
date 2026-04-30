import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DossiersContent } from "./dossiers-content";
import type { Profile, Property } from "@/lib/types";

export default async function DossiersPage() {
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

  const typedProfile = profile as Profile;

  let properties: Property[] = [];

  if (typedProfile.role === "owner") {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    properties = (data || []) as Property[];
  } else {
    const { data } = await supabase
      .from("properties")
      .select("*, jobs!inner(*)")
      .eq("jobs.specialist_id", user.id)
      .order("created_at", { ascending: false });
    properties = (data || []) as Property[];
  }

  return <DossiersContent profile={typedProfile} properties={properties} />;
}
