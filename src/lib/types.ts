export type Stage =
  | "New"
  | "Contacted"
  | "Nurturing"
  | "Showing"
  | "Under Contract"
  | "Closed"
  | "Lost";

export type Source = "Open House" | "Referral" | "Inquiry" | "Business Card" | "Other";
export type Timeline = "immediate" | "1-3" | "3-6" | "6plus" | "browsing";
export type HasAgent = "no" | "unsure" | "yes";
export type Bucket = "hot" | "warm" | "cold";

export interface Agent {
  id: string;
  name: string;
  brokerage: string | null;
  brokerage_id: string | null;
  role: "agent" | "admin";
  commission_split: number;
  created_at: string;
}

export type AgreementType = "sale" | "rental";

export interface Listing {
  id: string;
  agent_id: string;
  address: string;
  price: number | null;
  agreement_type: AgreementType;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

// Minimal public-facing shape from the `kiosk_listings` view -- no price,
// no other agent data. Used only by the unauthenticated kiosk dropdown.
export interface KioskListing {
  id: string;
  agent_id: string;
  address: string;
  agreement_type: AgreementType;
}

export interface Lead {
  id: string;
  agent_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: Source;
  timeline: Timeline;
  has_agent: HasAgent;
  notes: string | null;
  stage: Stage;
  auto_score: number;
  manual_score: number | null;
  deal_value: number | null;
  sort_order: number | null;
  deleted_at: string | null;
  possible_duplicate_of: string | null;
  listing_id: string | null;
  created_at: string;
}

// Read shape from the `leads_with_status` view -- effective_score/bucket/
// next_touch_due/is_active are computed live in Postgres, never stored.
export interface LeadWithStatus extends Lead {
  effective_score: number;
  bucket: Bucket;
  last_touch_at: string;
  next_touch_due: string;
  is_active: boolean;
}

export interface Interaction {
  id: string;
  lead_id: string;
  text: string;
  created_at: string;
}

export interface Task {
  id: string;
  agent_id: string;
  text: string;
  done: boolean;
  created_at: string;
}

export interface Template {
  id: string;
  agent_id: string | null;
  title: string;
  body: string;
}

export interface LeadFormValues {
  name: string;
  phone: string;
  email: string;
  source: Source;
  timeline: Timeline;
  hasAgent: HasAgent;
  notes: string;
}
