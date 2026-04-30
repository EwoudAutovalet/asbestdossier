import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AnalyticsContent } from "./analytics-content";
import type { Profile, Property } from "@/lib/types";

export default async function AnalyticsPage() {
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
  if ((profile as Profile).role !== "owner") redirect("/dashboard");

  // Monthly costs
  const { data: monthlyCosts } = await supabase
    .from("jobs")
    .select("created_at, total_cost, status, property:properties!inner(owner_id)")
    .eq("property.owner_id", user.id);

  // Jobs by status
  const { data: allJobs } = await supabase
    .from("jobs")
    .select("status, property:properties!inner(owner_id)")
    .eq("property.owner_id", user.id);

  // Removals by component
  const { data: removals } = await supabase
    .from("removals")
    .select("component_name, removed_at, job:jobs!inner(started_at, property:properties!inner(owner_id))")
    .eq("job.property.owner_id", user.id);

  // Completed jobs for lead time
  const { data: completedJobs } = await supabase
    .from("jobs")
    .select("started_at, completed_at, property:properties!inner(owner_id)")
    .eq("property.owner_id", user.id)
    .eq("status", "completed")
    .not("started_at", "is", null)
    .not("completed_at", "is", null);

  // Properties with costs
  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, city, postal_code, status, jobs(total_cost)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <AnalyticsContent
      monthlyCosts={(monthlyCosts || []) as { created_at: string; total_cost: number | null; status: string }[]}
      allJobs={(allJobs || []) as { status: string }[]}
      removals={(removals || []) as { component_name: string }[]}
      completedJobs={(completedJobs || []) as { started_at: string; completed_at: string }[]}
      properties={(properties || []) as (Property & { jobs: { total_cost: number | null }[] })[]}
    />
  );
}
