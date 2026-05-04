import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { CertificateEditor } from "@/components/certificates/certificate-editor";
import type {
  Profile,
  Property,
  Job,
  InspectionChecklist,
  ChecklistItem,
  InventoryCertificate,
  CertificateItem,
} from "@/lib/types";

export default async function AttestPage({
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

  if (!profile || profile.role !== "specialist") redirect("/dashboard");

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) notFound();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, checklists:inspection_checklists(*, items:checklist_items(*))")
    .eq("property_id", id)
    .eq("specialist_id", user.id)
    .order("created_at", { ascending: false });

  const { data: owner } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", (property as Property).owner_id)
    .single();

  const { data: existingCertificates } = await supabase
    .from("inventory_certificates")
    .select("*, items:certificate_items(*)")
    .eq("property_id", id)
    .eq("specialist_id", user.id)
    .order("created_at", { ascending: false });

  const allChecklistItems = (jobs || []).flatMap((job: Job & { checklists: (InspectionChecklist & { items: ChecklistItem[] })[] }) =>
    (job.checklists || []).flatMap((cl) =>
      (cl.items || []).filter((item) => item.contains_asbestos === true).map((item) => ({
        ...item,
        jobTitle: job.title,
        checklistDate: cl.inspected_at,
      }))
    )
  );

  return (
    <CertificateEditor
      profile={profile as Profile}
      property={property as Property}
      owner={(owner as Profile) || null}
      jobs={(jobs || []) as (Job & { checklists: (InspectionChecklist & { items: ChecklistItem[] })[] })[]}
      asbestosItems={allChecklistItems}
      existingCertificates={(existingCertificates || []) as (InventoryCertificate & { items: CertificateItem[] })[]}
    />
  );
}
