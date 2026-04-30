import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { PropertyDetail } from "./property-detail";
import type { Profile, Property, Job, Attachment, Removal, TimelineEvent, InspectionChecklist, ChecklistItem } from "@/lib/types";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) notFound();

  const typedProperty = property as Property;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, specialist:profiles(*), attachments(*), removals(*), checklists:inspection_checklists(*, items:checklist_items(*))")
    .eq("property_id", id)
    .order("created_at", { ascending: false });

  const { data: timeline } = await supabase
    .from("timeline_events")
    .select("*, actor:profiles(*)")
    .eq("property_id", id)
    .order("created_at", { ascending: false });

  const { data: owner } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", typedProperty.owner_id)
    .single();

  const { data: specialists } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "specialist")
    .order("full_name");

  return (
    <PropertyDetail
      profile={profile as Profile}
      property={typedProperty}
      owner={(owner as Profile) || null}
      jobs={(jobs || []) as (Job & { specialist: Profile | null; attachments: Attachment[]; removals: Removal[]; checklists: (InspectionChecklist & { items: ChecklistItem[] })[] })[]}
      timeline={(timeline || []) as (TimelineEvent & { actor: Profile })[]}
      specialists={(specialists || []) as Profile[]}
    />
  );
}
