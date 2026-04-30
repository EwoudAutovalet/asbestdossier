import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import type { Profile, Job, Property, TimelineEvent, Quote } from "@/lib/types";

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
  let timeline: (TimelineEvent & { actor: Profile })[] = [];
  let pendingQuotes: (Quote & { job: Job & { property: Property } })[] = [];

  if (typedProfile.role === "owner") {
    const { data } = await supabase
      .from("jobs")
      .select("*, property:properties!inner(*), specialist:profiles(*)")
      .eq("property.owner_id", user.id)
      .order("created_at", { ascending: false });
    jobs = (data || []) as typeof jobs;

    const propertyIds = jobs.map((j) => j.property_id);
    if (propertyIds.length > 0) {
      const { data: tlData } = await supabase
        .from("timeline_events")
        .select("*, actor:profiles(*)")
        .in("property_id", [...new Set(propertyIds)])
        .order("created_at", { ascending: false })
        .limit(10);
      timeline = (tlData || []) as typeof timeline;
    }

    const { data: quoteData } = await supabase
      .from("quotes")
      .select("*, job:jobs(*, property:properties(*))")
      .eq("status", "submitted")
      .order("created_at", { ascending: false });
    if (quoteData) {
      pendingQuotes = (quoteData as typeof pendingQuotes).filter(
        (q) => (q.job?.property as Property)?.owner_id === user.id
      );
    }
  } else {
    const { data } = await supabase
      .from("jobs")
      .select("*, property:properties(*), specialist:profiles(*)")
      .eq("specialist_id", user.id)
      .order("created_at", { ascending: false });
    jobs = (data || []) as typeof jobs;

    const { data: quoteData } = await supabase
      .from("quotes")
      .select("*, job:jobs(*, property:properties(*))")
      .eq("specialist_id", user.id)
      .order("created_at", { ascending: false });
    if (quoteData) {
      pendingQuotes = (quoteData as typeof pendingQuotes).filter(
        (q) => q.status === "submitted" || q.status === "draft"
      );
    }
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
      timeline={timeline}
      pendingQuotes={pendingQuotes}
    />
  );
}
