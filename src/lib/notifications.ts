import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "./types";

interface NotifyParams {
  supabase: SupabaseClient;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function notify({ supabase, userId, type, title, body, link, metadata }: NotifyParams) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body || null,
    link: link || null,
    read: false,
    metadata: metadata || {},
  });
}

interface TimelineParams {
  supabase: SupabaseClient;
  propertyId: string;
  jobId?: string;
  actorId: string;
  action: string;
  details?: Record<string, unknown>;
}

export async function addTimelineEvent({ supabase, propertyId, jobId, actorId, action, details }: TimelineParams) {
  await supabase.from("timeline_events").insert({
    property_id: propertyId,
    job_id: jobId || null,
    actor_id: actorId,
    action,
    details: details || {},
  });
}
