import type { LeadWithStatus } from "@/lib/types";

// Ports the prototype's reorderAndMove() 1:1. sort_order is only meaningful
// *within* a (agent_id, stage) or (agent_id, source) group -- see spec §4.
export function reorderAndMove(
  allLeads: LeadWithStatus[],
  leadId: string,
  groupField: "stage" | "source",
  groupValue: string,
  beforeLeadId: string | null,
): {
  next: LeadWithStatus[];
  patches: { id: string; sort_order: number; stage?: string; source?: string }[];
} {
  const dragged = allLeads.find((l) => l.id === leadId);
  if (!dragged) return { next: allLeads, patches: [] };

  const others = allLeads
    .filter((l) => l.id !== leadId && l[groupField] === groupValue)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  let insertIndex = others.length;
  if (beforeLeadId) {
    const idx = others.findIndex((l) => l.id === beforeLeadId);
    if (idx !== -1) insertIndex = idx;
  }

  const updatedDragged: LeadWithStatus = { ...dragged, [groupField]: groupValue };
  const newGroup = [...others.slice(0, insertIndex), updatedDragged, ...others.slice(insertIndex)].map(
    (l, idx) => ({ ...l, sort_order: idx }),
  );

  const newGroupIds = new Map(newGroup.map((l) => [l.id, l]));
  const next = allLeads.map((l) => newGroupIds.get(l.id) ?? l);

  const patches = newGroup.map((l) => ({
    id: l.id,
    sort_order: l.sort_order as number,
    ...(l.id === leadId ? { [groupField]: groupValue } : {}),
  }));

  return { next, patches };
}
