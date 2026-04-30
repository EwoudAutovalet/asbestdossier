import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { SpecialistenContent } from "./specialisten-content";
import type { Profile } from "@/lib/types";

export default async function SpecialistenPage() {
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

  if (typedProfile.role !== "owner") {
    redirect("/dashboard");
  }

  const { data: specialists } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "specialist")
    .order("full_name");

  return <SpecialistenContent specialists={(specialists || []) as Profile[]} />;
}
