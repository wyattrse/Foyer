import { ShieldCheck } from "lucide-react";
import { COLORS } from "@/lib/theme";
import { LeadCard } from "@/components/leads/LeadCard";
import type { LeadWithStatus } from "@/lib/types";

export function Board({
  leads,
  groupField,
  groups,
  onSelect,
  onDropCard,
}: {
  leads: LeadWithStatus[];
  groupField: "stage" | "source";
  groups: string[];
  onSelect: (lead: LeadWithStatus) => void;
  onDropCard: (leadId: string, groupValue: string, beforeLeadId: string | null) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck size={32} style={{ color: COLORS.inkSoft }} className="mb-3" />
        <p className="text-sm max-w-xs" style={{ color: COLORS.inkSoft }}>
          No leads match. Try clearing your search or filters.
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map((g, gi) => {
        const groupLeads = leads.filter((l) => l[groupField] === g).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return (
          <div
            key={g}
            className="flex-shrink-0 w-64"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) onDropCard(id, g, null);
            }}
          >
            <div className="flex items-center justify-between mb-2.5 px-1 pb-2" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
                {groupField === "stage" && (
                  <span style={{ color: COLORS.accentBright, fontFamily: "'Space Mono', monospace" }}>{String(gi + 1).padStart(2, "0")} </span>
                )}
                {g}
              </p>
              <span className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>
                {groupLeads.length}
              </span>
            </div>
            <div className="min-h-[40px]">
              {groupLeads.map((l, idx) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  delay={idx * 35}
                  onClick={() => onSelect(l)}
                  dragProps={{
                    draggable: true,
                    onDragStart: (e) => e.dataTransfer.setData("text/plain", l.id),
                    onDragOver: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    },
                    onDrop: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const id = e.dataTransfer.getData("text/plain");
                      if (id && id !== l.id) onDropCard(id, g, l.id);
                    },
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
