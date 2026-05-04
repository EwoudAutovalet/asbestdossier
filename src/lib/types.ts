export type UserRole = "owner" | "specialist" | "broker";

export type PropertyStatus = "new" | "inspection" | "remediation" | "cleared";

export type JobStatus =
  | "pending"
  | "inspection"
  | "quoted"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AttachmentType = "site_photo" | "paper_scan" | "disposal_certificate";

export type RemovalMethodType = "eenvoudige_handeling" | "hermetische_zone";

export type CertificateStatus = "draft" | "issued" | "expired" | "revoked";
export type AsbestosType = "hechtgebonden" | "losgebonden";
export type RecommendedAction = "verwijderen" | "inkapselen" | "monitoring";

export type AppointmentType = "inspection" | "removal" | "follow_up";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export type BrokerOwnerStatus = "invited" | "active" | "revoked";

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
  broker_id: string | null;
  address: string;
  city: string;
  postal_code: string;
  status: PropertyStatus;
  description: string | null;
  gebouweenheid_id: string | null;
  gebouw_id: string | null;
  perceel_id: string | null;
  bouwjaar: number | null;
  gebouw_status: string | null;
  oppervlakte: number | null;
  verdiepingen: number | null;
  kadaster_referentie: string | null;
  basisregisters_synced_at: string | null;
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
  handling_method: RemovalMethodType | null;
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
  disposal_reference: string | null;
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
  handling_method: RemovalMethodType | null;
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

export type RiskLevel = "laag" | "gemiddeld" | "hoog" | "kritiek";
export type ItemCondition = "goed" | "beschadigd" | "ernstig_beschadigd" | "verwijderd";
export type ItemPriority = "geen_actie" | "monitoring" | "planning" | "urgent";

export interface InspectionChecklist {
  id: string;
  job_id: string;
  specialist_id: string;
  inspected_at: string;
  general_condition: string | null;
  risk_level: RiskLevel | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  category: string;
  item_name: string;
  contains_asbestos: boolean | null;
  condition: ItemCondition | null;
  material_type: string | null;
  location_description: string | null;
  photo_url: string | null;
  priority: ItemPriority | null;
  notes: string | null;
  application_id: string | null;
  binder_id: string | null;
  is_hechtgebonden: boolean | null;
  quantity: number | null;
  quantity_unit: string | null;
  condition_score: string | null;
  coverage: string | null;
  exposure: string | null;
  accessibility: string | null;
  calculated_risk: string | null;
  sample_reference: string | null;
  sample_result: string | null;
  created_at: string;
}

export type QuoteStatus = "draft" | "submitted" | "approved" | "rejected";

export interface Quote {
  id: string;
  job_id: string;
  specialist_id: string;
  status: QuoteStatus;
  description: string | null;
  labor_cost: number;
  material_cost: number;
  disposal_cost: number;
  total_cost: number;
  valid_until: string | null;
  notes: string | null;
  submitted_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at: string;
}

export type QuoteWithLines = Quote & { lines: QuoteLine[] };

export type NotificationType =
  | "quote_submitted"
  | "quote_approved"
  | "quote_rejected"
  | "job_status_changed"
  | "message_received"
  | "specialist_assigned"
  | "inspection_completed"
  | "removal_registered"
  | "certificate_issued"
  | "certificate_expiring"
  | "appointment_created"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "broker_invitation"
  | "broker_accepted"
  | "marketplace_new_request"
  | "marketplace_bid_received"
  | "marketplace_bid_accepted"
  | "marketplace_bid_rejected";

export type MarketplaceWorkType = "inspection" | "removal" | "full" | "other";
export type MarketplaceUrgency = "flexible" | "soon" | "urgent";
export type MarketplaceRequestStatus = "open" | "closed" | "cancelled";
export type MarketplaceBidStatus = "submitted" | "accepted" | "rejected" | "withdrawn";

export interface MarketplaceRequest {
  id: string;
  owner_id: string;
  property_id: string;
  title: string;
  description: string | null;
  work_type: MarketplaceWorkType;
  urgency: MarketplaceUrgency;
  deadline: string | null;
  budget_indication: number | null;
  postal_code: string;
  city: string;
  bouwjaar: number | null;
  oppervlakte: number | null;
  status: MarketplaceRequestStatus;
  accepted_bid_id: string | null;
  resulting_job_id: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceBid {
  id: string;
  request_id: string;
  specialist_id: string;
  amount: number;
  message: string | null;
  valid_until: string | null;
  estimated_duration_days: number | null;
  status: MarketplaceBidStatus;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceBidWithSpecialist extends MarketplaceBid {
  specialist: Profile;
}

export interface MarketplaceRequestWithBids extends MarketplaceRequest {
  bids: MarketplaceBidWithSpecialist[];
  bid_count?: number;
}

export interface MarketplaceRequestWithOwner extends MarketplaceRequest {
  owner: Profile;
}

export interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageWithSender extends Message {
  sender: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InventoryCertificate {
  id: string;
  property_id: string;
  job_id: string | null;
  specialist_id: string;
  certificate_number: string;
  status: CertificateStatus;
  issued_at: string | null;
  expires_at: string | null;
  risk_summary: Record<string, unknown>;
  conclusion: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateItem {
  id: string;
  certificate_id: string;
  location: string;
  material_type: string;
  asbestos_type: AsbestosType;
  condition: string;
  risk_level: RiskLevel;
  recommended_action: RecommendedAction;
  photo_url: string | null;
  notes: string | null;
  sort_order: number;
}

export interface CertificateWithItems extends InventoryCertificate {
  items: CertificateItem[];
}

export interface Appointment {
  id: string;
  job_id: string | null;
  property_id: string;
  specialist_id: string | null;
  owner_id: string;
  type: AppointmentType;
  title: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: AppointmentStatus;
  location: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithDetails extends Appointment {
  property: Property;
  specialist: Profile | null;
  owner: Profile;
}

export interface SpecialistAvailability {
  id: string;
  specialist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface BrokerOwner {
  id: string;
  broker_id: string;
  owner_id: string;
  status: BrokerOwnerStatus;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface BrokerOwnerWithProfile extends BrokerOwner {
  owner: Profile;
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
      quotes: {
        Row: Quote;
        Insert: Omit<Quote, "id" | "total_cost" | "created_at" | "updated_at">;
        Update: Partial<Omit<Quote, "id" | "total_cost" | "created_at" | "updated_at">>;
      };
      quote_lines: {
        Row: QuoteLine;
        Insert: Omit<QuoteLine, "id" | "total" | "created_at">;
        Update: Partial<Omit<QuoteLine, "id" | "total" | "created_at">>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at">;
        Update: Partial<Omit<Message, "id" | "created_at">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at">;
        Update: Partial<Omit<Notification, "id" | "created_at">>;
      };
      inventory_certificates: {
        Row: InventoryCertificate;
        Insert: Omit<InventoryCertificate, "id" | "certificate_number" | "created_at" | "updated_at">;
        Update: Partial<Omit<InventoryCertificate, "id" | "certificate_number" | "created_at" | "updated_at">>;
      };
      certificate_items: {
        Row: CertificateItem;
        Insert: Omit<CertificateItem, "id">;
        Update: Partial<Omit<CertificateItem, "id">>;
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Appointment, "id" | "created_at" | "updated_at">>;
      };
      specialist_availability: {
        Row: SpecialistAvailability;
        Insert: Omit<SpecialistAvailability, "id">;
        Update: Partial<Omit<SpecialistAvailability, "id">>;
      };
      broker_owners: {
        Row: BrokerOwner;
        Insert: Omit<BrokerOwner, "id" | "created_at">;
        Update: Partial<Omit<BrokerOwner, "id" | "created_at">>;
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
  disposal_certificate: "Bewijs van Afvalverwerking",
};

export const REMOVAL_METHOD_LABELS: Record<RemovalMethodType, string> = {
  eenvoudige_handeling: "Eenvoudige handeling",
  hermetische_zone: "Hermetische zone",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Concept",
  submitted: "Ingediend",
  approved: "Goedgekeurd",
  rejected: "Afgewezen",
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  laag: "Laag",
  gemiddeld: "Gemiddeld",
  hoog: "Hoog",
  kritiek: "Kritiek",
};

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  goed: "Goed",
  beschadigd: "Beschadigd",
  ernstig_beschadigd: "Ernstig beschadigd",
  verwijderd: "Verwijderd",
};

export const PRIORITY_LABELS: Record<ItemPriority, string> = {
  geen_actie: "Geen actie",
  monitoring: "Monitoring",
  planning: "Planning",
  urgent: "Urgent",
};

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  draft: "Concept",
  issued: "Uitgegeven",
  expired: "Verlopen",
  revoked: "Ingetrokken",
};

export const ASBESTOS_TYPE_LABELS: Record<AsbestosType, string> = {
  hechtgebonden: "Hechtgebonden",
  losgebonden: "Losgebonden",
};

export const RECOMMENDED_ACTION_LABELS: Record<RecommendedAction, string> = {
  verwijderen: "Verwijderen",
  inkapselen: "Inkapselen",
  monitoring: "Monitoring",
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  inspection: "Inspectie",
  removal: "Verwijdering",
  follow_up: "Opvolging",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Gepland",
  confirmed: "Bevestigd",
  completed: "Afgerond",
  cancelled: "Geannuleerd",
  no_show: "Niet verschenen",
};

export const BROKER_OWNER_STATUS_LABELS: Record<BrokerOwnerStatus, string> = {
  invited: "Uitgenodigd",
  active: "Actief",
  revoked: "Ingetrokken",
};

export const MARKETPLACE_WORK_TYPE_LABELS: Record<MarketplaceWorkType, string> = {
  inspection: "Inspectie / inventarisatie",
  removal: "Verwijdering",
  full: "Volledig traject (inspectie + verwijdering)",
  other: "Andere",
};

export const MARKETPLACE_URGENCY_LABELS: Record<MarketplaceUrgency, string> = {
  flexible: "Flexibel",
  soon: "Binnen enkele weken",
  urgent: "Dringend",
};

export const MARKETPLACE_REQUEST_STATUS_LABELS: Record<MarketplaceRequestStatus, string> = {
  open: "Open",
  closed: "Gesloten",
  cancelled: "Geannuleerd",
};

export const MARKETPLACE_BID_STATUS_LABELS: Record<MarketplaceBidStatus, string> = {
  submitted: "Ingediend",
  accepted: "Aanvaard",
  rejected: "Afgewezen",
  withdrawn: "Ingetrokken",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: "Eigenaar",
  specialist: "Specialist",
  broker: "Makelaar",
};

export const INSPECTION_CATEGORIES = [
  "Dak",
  "Gevelbekleding",
  "Leidingen",
  "Vloeren",
  "Isolatie",
  "Schoorsteen",
  "Kelder",
  "Technische ruimte",
  "Overig",
] as const;

// Basisregisters Vlaanderen types
export interface BasisregisterAdres {
  identificator: { id: string; objectId: string };
  detail: string;
  gemeente: { gemeentenaam: string };
  straatnaam: { straatnaam: string };
  huisnummer: string;
  postcode: string;
  gebouweenheden: string[];
}

export interface BasisregisterGebouweenheid {
  identificator: { id: string; objectId: string };
  gebouw: { objectId: string; detail: string };
  status: string;
}

export interface BasisregisterGebouw {
  identificator: { id: string; objectId: string };
  geometrieMethode: string;
  status: string;
  perceelObjectIds?: string[];
}

export interface GebouwDetails {
  gebouweenheidId: string;
  gebouwId: string;
  perceelId: string | null;
  bouwjaar: number | null;
  status: string;
  oppervlakte: number | null;
  verdiepingen: number | null;
}

// IP2 Protocol types
export type ConditionScore = "onbeschadigd" | "licht_beschadigd" | "matig_beschadigd" | "zwaar_beschadigd";
export type CoverageLevel = "niet_afgedekt" | "gedeeltelijk_afgedekt" | "volledig_afgedekt";
export type ExposureType = "binnenlucht" | "buitenlucht" | "beide" | "geen";
export type Accessibility = "vrij_bereikbaar" | "beperkt_bereikbaar" | "niet_bereikbaar";
export type CalculatedRisk = "zeer_laag" | "laag" | "verhoogd" | "hoog";
export type RecommendedActionIP2 = "geen_actie" | "beheer_in_situ" | "inkapselen" | "verwijderen_niet_dringend" | "verwijderen_dringend";
export type SampleResult = "chrysotiel" | "amosiet" | "crocidoliet" | "tremoliet" | "actinoliet" | "anthofylliet" | "negatief";
export type AnalysisMethod = "polarisatiemicroscopie" | "SEM_EDS" | "XRD";
export type QuantityUnit = "m2" | "m3" | "lopende_meter" | "kg" | "stuks";

export interface AsbestosApplication {
  id: string;
  code: string;
  name: string;
  category: string;
  sort_order: number;
}

export interface AsbestosBinder {
  id: string;
  code: string;
  name: string;
  application_codes: string[];
  is_hechtgebonden: boolean;
  sort_order: number;
}

export interface InspectionSample {
  id: string;
  checklist_id: string;
  checklist_item_id: string | null;
  sample_number: string;
  material_description: string | null;
  location_description: string | null;
  analysis_method: AnalysisMethod | null;
  result: SampleResult | null;
  lab_name: string | null;
  lab_report_ref: string | null;
  analyzed_at: string | null;
  created_at: string;
}

export const CONDITION_SCORE_LABELS: Record<ConditionScore, string> = {
  onbeschadigd: "Onbeschadigd / niet verweerd",
  licht_beschadigd: "Licht beschadigd / licht verweerd",
  matig_beschadigd: "Matig beschadigd / matig verweerd",
  zwaar_beschadigd: "Zwaar beschadigd / zwaar verweerd",
};

export const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  niet_afgedekt: "Niet afgedekt",
  gedeeltelijk_afgedekt: "Gedeeltelijk afgedekt",
  volledig_afgedekt: "Volledig afgedekt",
};

export const EXPOSURE_LABELS: Record<ExposureType, string> = {
  binnenlucht: "Binnenlucht",
  buitenlucht: "Buitenlucht",
  beide: "Binnen- en buitenlucht",
  geen: "Geen directe blootstelling",
};

export const ACCESSIBILITY_LABELS: Record<Accessibility, string> = {
  vrij_bereikbaar: "Vrij bereikbaar",
  beperkt_bereikbaar: "Beperkt bereikbaar",
  niet_bereikbaar: "Niet bereikbaar",
};

export const CALCULATED_RISK_LABELS: Record<CalculatedRisk, string> = {
  zeer_laag: "Zeer laag",
  laag: "Laag",
  verhoogd: "Verhoogd",
  hoog: "Hoog",
};

export const RECOMMENDED_ACTION_IP2_LABELS: Record<RecommendedActionIP2, string> = {
  geen_actie: "Geen actie nodig",
  beheer_in_situ: "Beheer in situ (monitoring)",
  inkapselen: "Inkapselen",
  verwijderen_niet_dringend: "Verwijderen (niet dringend)",
  verwijderen_dringend: "Verwijderen (dringend)",
};

export const QUANTITY_UNIT_LABELS: Record<QuantityUnit, string> = {
  m2: "m²",
  m3: "m³",
  lopende_meter: "Lopende meter",
  kg: "Kilogram",
  stuks: "Stuks",
};

export const ANALYSIS_METHOD_LABELS: Record<AnalysisMethod, string> = {
  polarisatiemicroscopie: "Polarisatiemicroscopie (PLM)",
  SEM_EDS: "SEM-EDS",
  XRD: "X-ray diffractie (XRD)",
};

export const SAMPLE_RESULT_LABELS: Record<SampleResult, string> = {
  chrysotiel: "Chrysotiel (wit asbest)",
  amosiet: "Amosiet (bruin asbest)",
  crocidoliet: "Crocidoliet (blauw asbest)",
  tremoliet: "Tremoliet",
  actinoliet: "Actinoliet",
  anthofylliet: "Anthofylliet",
  negatief: "Negatief (geen asbest)",
};
