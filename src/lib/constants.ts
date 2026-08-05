import type { HasAgent, Source, Stage, Timeline } from "@/lib/types";

export const STAGES: Stage[] = [
  "New",
  "Contacted",
  "Nurturing",
  "Showing",
  "Under Contract",
  "Closed",
  "Lost",
];

export const SOURCES: Source[] = [
  "Open House",
  "Referral",
  "Inquiry",
  "Business Card",
  "Other",
];

export const TIMELINE_OPTIONS: { value: Timeline; label: string }[] = [
  { value: "immediate", label: "0-1 month" },
  { value: "1-3", label: "1-3 months" },
  { value: "3-6", label: "3-6 months" },
  { value: "6plus", label: "6+ months" },
  { value: "browsing", label: "Just browsing" },
];

export const AGENT_OPTIONS: { value: HasAgent; label: string }[] = [
  { value: "no", label: "No agent yet" },
  { value: "unsure", label: "Not sure" },
  { value: "yes", label: "Already has one" },
];

export const DAY_MS = 24 * 60 * 60 * 1000;
