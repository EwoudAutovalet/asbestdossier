import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import type { Profile, Job, Property, TimelineEvent, Quote, Appointment } from "@/lib/types";

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
  } else if (typedProfile.role === "broker") {
    const { data: boData } = await supabase
      .from("broker_owners")
      .select("owner_id")
      .eq("broker_id", user.id)
      .eq("status", "active");
    const ownerIds = (boData || []).map((bo) => bo.owner_id);

    if (ownerIds.length > 0) {
      const { data } = await supabase
        .from("jobs")
        .select("*, property:properties!inner(*), specialist:profiles(*)")
        .in("property.owner_id", ownerIds)
        .order("created_at", { ascending: false });
      jobs = (data || []) as typeof jobs;

      const { data: quoteData } = await supabase
        .from("quotes")
        .select("*, job:jobs(*, property:properties(*))")
        .eq("status", "submitted")
        .order("created_at", { ascending: false });
      if (quoteData) {
        pendingQuotes = (quoteData as typeof pendingQuotes).filter(
          (q) => ownerIds.includes((q.job?.property as Property)?.owner_id)
        );
      }
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
  if (typedProfile.role === "owner" || typedProfile.role === "broker") {
    if (typedProfile.role === "owner") {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      properties = (data || []) as Property[];
    } else {
      const { data: boData } = await supabase
        .from("broker_owners")
        .select("owner_id")
        .eq("broker_id", user.id)
        .eq("status", "active");
      const ownerIds = (boData || []).map((bo) => bo.owner_id);
      if (ownerIds.length > 0) {
        const { data } = await supabase
          .from("properties")
          .select("*")
          .in("owner_id", ownerIds)
          .order("created_at", { ascending: false });
        properties = (data || []) as Property[];
      }
    }
  }

  let upcomingAppointments: Appointment[] = [];
  if (typedProfile.role === "specialist") {
    const { data: aptData } = await supabase
      .from("appointments")
      .select("*")
      .eq("specialist_id", user.id)
      .gte("scheduled_start", new Date().toISOString())
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: true })
      .limit(5);
    upcomingAppointments = (aptData || []) as Appointment[];
  } else if (typedProfile.role === "owner") {
    const { data: aptData } = await supabase
      .from("appointments")
      .select("*")
      .eq("owner_id", user.id)
      .gte("scheduled_start", new Date().toISOString())
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: true })
      .limit(5);
    upcomingAppointments = (aptData || []) as Appointment[];
  } else if (typedProfile.role === "broker") {
    const { data: boData } = await supabase
      .from("broker_owners")
      .select("owner_id")
      .eq("broker_id", user.id)
      .eq("status", "active");
    const ownerIds = (boData || []).map((bo) => bo.owner_id);
    if (ownerIds.length > 0) {
      const { data: aptData } = await supabase
        .from("appointments")
        .select("*")
        .in("owner_id", ownerIds)
        .gte("scheduled_start", new Date().toISOString())
        .neq("status", "cancelled")
        .order("scheduled_start", { ascending: true })
        .limit(5);
      upcomingAppointments = (aptData || []) as Appointment[];
    }
  }

  return (
    <DashboardContent
      profile={typedProfile}
      jobs={jobs}
      properties={properties}
      timeline={timeline}
      pendingQuotes={pendingQuotes}
      upcomingAppointments={upcomingAppointments}
    />
  );
}
