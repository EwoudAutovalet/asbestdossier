import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { SpecialistDashboard } from "./specialist-dashboard";
import type { Profile, Job, Property, Attachment, Removal } from "@/lib/types";

export default async function SpecialistPage() {
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

  if (typedProfile.role !== "specialist") {
    redirect("/dashboard");
  }

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, property:properties(*), attachments(*), removals(*)")
    .eq("specialist_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <SpecialistDashboard
      profile={typedProfile}
      jobs={(jobs || []) as (Job & { property: Property; attachments: Attachment[]; removals: Removal[] })[]}
    />
  );
}
