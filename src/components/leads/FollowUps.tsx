import { BellRing } from "lucide-react";
import { CARD_SM, COLORS } from "@/lib/theme";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { dueStatus } from "@/lib/scoring";
import type { LeadWithStatus } from "@/lib/types";

export function FollowUps({ leads, onSelect }: { leads: LeadWithStatus[]; onSelect: (lead: LeadWithStatus) => void }) {
  const active = leads
    .filter((l) => l.is_active)
    .map((lead) => ({ lead, due: lead.next_touch_due }))
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BellRing size={32} style={{ color: COLORS.inkSoft }} className="mb-3" />
        <p className="text-sm max-w-xs" style={{ color: COLORS.inkSoft }}>
          No active leads match right now.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2 max-w-xl">
      {active.map(({ lead, due }, idx) => {
        const status = dueStatus(due);
        const color = status === "overdue" ? COLORS.accentBright : status === "today" ? COLORS.warm : COLORS.inkSoft;
        const lbl =
          status === "overdue"
            ? `Overdue · was due ${new Date(due).toLocaleDateString()}`
            : status === "today"
              ? "Due today"
              : `Due ${new Date(due).toLocaleDateString()}`;
        return (
          <button
            key={lead.id}
            onClick={() => onSelect(lead)}
            className="mark anim-fadeup w-full flex items-center gap-3 p-3.5 text-left"
            style={{ ...CARD_SM, borderColor: status === "overdue" ? COLORS.accentBright + "70" : COLORS.border, animationDelay: `${idx * 35}ms` }}
          >
            <ScoreRing score={lead.effective_score} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>
                {lead.name}
              </p>
              <p className="text-xs truncate uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>
                {lead.stage} · {lead.source}
              </p>
            </div>
            <span className="text-xs font-medium flex-shrink-0" style={{ color }}>
              {lbl}
            </span>
          </button>
        );
      })}
    </div>
  );
}
