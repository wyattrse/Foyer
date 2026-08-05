import { COLORS } from "@/lib/theme";
import { TIMELINE_OPTIONS } from "@/lib/constants";
import type { Bucket, Lead, LeadFormValues, LeadWithStatus } from "@/lib/types";

// Mirrors public.compute_auto_score() in the DB -- used for instant UI feedback
// on the lead form / edit panel before the server-computed value comes back.
// The DB trigger is the single source of truth; this never gets persisted.
export function computeAutoScore(lead: {
  timeline: string;
  hasAgent?: string;
  has_agent?: string;
  source: string;
}) {
  const timelineW: Record<string, number> = { immediate: 40, "1-3": 30, "3-6": 15, "6plus": 5, browsing: 0 };
  const agentW: Record<string, number> = { no: 20, unsure: 10, yes: 0 };
  const sourceW: Record<string, number> = { "Open House": 15, Referral: 20, Inquiry: 15, "Business Card": 5, Other: 5 };
  const hasAgent = lead.hasAgent ?? lead.has_agent ?? "";
  let score = 10;
  score += timelineW[lead.timeline] ?? 10;
  score += agentW[hasAgent] ?? 10;
  score += sourceW[lead.source] ?? 5;
  return Math.min(100, score);
}

export function bucketOf(score: number): Bucket {
  if (score >= 65) return "hot";
  if (score >= 35) return "warm";
  return "cold";
}

export function bucketColor(bucket: Bucket) {
  return { hot: COLORS.accentBright, warm: COLORS.warm, cold: COLORS.cold }[bucket];
}

export function effectiveScore(lead: Lead) {
  return lead.manual_score != null ? lead.manual_score : lead.auto_score;
}

export function isActiveLead(lead: Lead) {
  return lead.stage !== "Closed" && lead.stage !== "Lost";
}

export type DueStatus = "overdue" | "today" | "upcoming";

export function dueStatus(dueIso: string): DueStatus {
  const diff = new Date(dueIso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 24 * 60 * 60 * 1000) return "today";
  return "upcoming";
}

export function matchesSearch(lead: { name: string; phone: string | null; email: string | null }, q: string) {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (
    (lead.name || "").toLowerCase().includes(s) ||
    (lead.phone || "").toLowerCase().includes(s) ||
    (lead.email || "").toLowerCase().includes(s)
  );
}

export function findDuplicateLead<T extends { phone: string | null; email: string | null }>(
  leads: T[],
  form: { phone: string; email: string },
): T | null {
  const phone = (form.phone || "").trim().toLowerCase();
  const email = (form.email || "").trim().toLowerCase();
  if (!phone && !email) return null;
  return (
    leads.find(
      (l) =>
        (phone && (l.phone || "").trim().toLowerCase() === phone) ||
        (email && (l.email || "").trim().toLowerCase() === email),
    ) || null
  );
}

export function exportLeadsCSV(leads: LeadWithStatus[]) {
  const headers = ["Name", "Phone", "Email", "Source", "Stage", "Timeline", "Has Agent", "Score", "Deal Value", "Created", "Notes"];
  const rows = leads.map((l) => [
    l.name,
    l.phone,
    l.email,
    l.source,
    l.stage,
    TIMELINE_OPTIONS.find((t) => t.value === l.timeline)?.label || l.timeline,
    l.has_agent,
    effectiveScore(l),
    l.deal_value ?? "",
    new Date(l.created_at).toLocaleDateString(),
    (l.notes || "").replace(/\n/g, " "),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `foyer-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function applyFormToLeadPatch(form: LeadFormValues) {
  return {
    name: form.name.trim(),
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    source: form.source,
    timeline: form.timeline,
    has_agent: form.hasAgent,
    notes: form.notes.trim() || null,
  };
}
