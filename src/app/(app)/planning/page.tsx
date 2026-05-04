import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { PlanningContent } from "@/components/planning/planning-content";
import type { Profile, Property, Appointment } from "@/lib/types";

export default async function PlanningPage() {
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

  let appointments: (Appointment & { property: Property; specialist: Profile | null; owner: Profile })[] = [];

  if (profile.role === "specialist") {
    const { data } = await supabase
      .from("appointments")
      .select("*, property:properties(*), specialist:profiles!appointments_specialist_id_fkey(*), owner:profiles!appointments_owner_id_fkey(*)")
      .eq("specialist_id", user.id)
      .order("scheduled_start", { ascending: true });
    appointments = (data || []) as typeof appointments;
  } else if (profile.role === "owner") {
    const { data } = await supabase
      .from("appointments")
      .select("*, property:properties(*), specialist:profiles!appointments_specialist_id_fkey(*), owner:profiles!appointments_owner_id_fkey(*)")
      .eq("owner_id", user.id)
      .order("scheduled_start", { ascending: true });
    appointments = (data || []) as typeof appointments;
  } else if (profile.role === "broker") {
    const { data: brokerOwners } = await supabase
      .from("broker_owners")
      .select("owner_id")
      .eq("broker_id", user.id)
      .eq("status", "active");

    const ownerIds = (brokerOwners || []).map((bo) => bo.owner_id);
    if (ownerIds.length > 0) {
      const { data } = await supabase
        .from("appointments")
        .select("*, property:properties(*), specialist:profiles!appointments_specialist_id_fkey(*), owner:profiles!appointments_owner_id_fkey(*)")
        .in("owner_id", ownerIds)
        .order("scheduled_start", { ascending: true });
      appointments = (data || []) as typeof appointments;
    }
  }

  const { data: specialists } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "specialist")
    .order("full_name");

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .order("address");

  return (
    <PlanningContent
      profile={profile as Profile}
      appointments={appointments}
      specialists={(specialists || []) as Profile[]}
      properties={(properties || []) as Property[]}
    />
  );
}
