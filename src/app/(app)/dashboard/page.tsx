import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import type { Profile, Job, Property } from "@/lib/types";

export default async function DashboardPage() {
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

  let jobs: (Job & { property: Property; specialist: Profile | null })[] = [];

  if (typedProfile.role === "owner") {
    const { data } = await supabase
      .from("jobs")
      .select("*, property:properties!inner(*), specialist:profiles(*)")
      .eq("property.owner_id", user.id)
      .order("created_at", { ascending: false });
    jobs = (data || []) as typeof jobs;
  } else {
    const { data } = await supabase
      .from("jobs")
      .select("*, property:properties(*), specialist:profiles(*)")
      .eq("specialist_id", user.id)
      .order("created_at", { ascending: false });
    jobs = (data || []) as typeof jobs;
  }

  let properties: Property[] = [];
  if (typedProfile.role === "owner") {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    properties = (data || []) as Property[];
  }

  return (
    <DashboardContent
      profile={typedProfile}
      jobs={jobs}
      properties={properties}
    />
  );
}
