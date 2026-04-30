export type UserRole = "owner" | "specialist";

export type PropertyStatus = "new" | "inspection" | "remediation" | "cleared";

export type JobStatus =
  | "pending"
  | "inspection"
  | "quoted"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AttachmentType = "site_photo" | "paper_scan";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  company_vat: string | null;
  company_address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  address: string;
  city: string;
  postal_code: string;
  status: PropertyStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  property_id: string;
  specialist_id: string | null;
  status: JobStatus;
  title: string;
  description: string | null;
  total_cost: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  job_id: string;
  uploaded_by: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  type: AttachmentType;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Removal {
  id: string;
  job_id: string;
  specialist_id: string;
  component_name: string;
  location: string;
  description: string | null;
  photo_url: string | null;
  photo_file_name: string | null;
  removed_at: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  property_id: string;
  job_id: string | null;
  actor_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      properties: {
        Row: Property;
        Insert: Omit<Property, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Property, "id" | "created_at" | "updated_at">>;
      };
      jobs: {
        Row: Job;
        Insert: Omit<Job, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Job, "id" | "created_at" | "updated_at">>;
      };
      attachments: {
        Row: Attachment;
        Insert: Omit<Attachment, "id" | "created_at">;
        Update: Partial<Omit<Attachment, "id" | "created_at">>;
      };
      timeline_events: {
        Row: TimelineEvent;
        Insert: Omit<TimelineEvent, "id" | "created_at">;
        Update: Partial<Omit<TimelineEvent, "id" | "created_at">>;
      };
    };
  };
}

// Joined types for UI convenience
export interface JobWithProperty extends Job {
  property: Property;
}

export interface JobWithDetails extends Job {
  property: Property;
  specialist: Profile | null;
  attachments: Attachment[];
}

export interface TimelineEventWithActor extends TimelineEvent {
  actor: Profile;
}

export interface PropertyWithJobs extends Property {
  jobs: Job[];
}

// Status labels in Dutch
export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  new: "Nieuw aangemeld",
  inspection: "Inspectie gepland",
  remediation: "Verwijdering bezig",
  cleared: "Afgerond",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: "In afwachting",
  inspection: "Inspectie",
  quoted: "Offerte ingediend",
  approved: "Goedgekeurd",
  in_progress: "Bezig",
  completed: "Afgerond",
  cancelled: "Geannuleerd",
};

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  site_photo: "Sitefoto",
  paper_scan: "Document Scan",
};
