import { AlertCircle, GripVertical, Pencil } from "lucide-react";
import { CARD_SM, COLORS } from "@/lib/theme";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { dueStatus } from "@/lib/scoring";
import type { LeadWithStatus } from "@/lib/types";

export function LeadCard({
  lead,
  onClick,
  dragProps,
  delay = 0,
}: {
  lead: LeadWithStatus;
  onClick: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
  delay?: number;
}) {
  const status = lead.is_active ? dueStatus(lead.next_touch_due) : null;
  return (
    <div
      {...dragProps}
      onClick={onClick}
      className="mark anim-fadeup w-full text-left p-3 sm:p-3.5 mb-2 sm:mb-2.5 cursor-pointer"
      style={{ ...CARD_SM, borderColor: status === "overdue" ? COLORS.accentBright + "70" : COLORS.border, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <ScoreRing score={lead.effective_score} size={38} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>
            {lead.name}
          </p>
          <p className="text-xs truncate uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>
            {lead.stage}
          </p>
        </div>
        {status === "overdue" && <AlertCircle size={13} style={{ color: COLORS.accentBright }} />}
        {lead.manual_score != null && <Pencil size={11} style={{ color: COLORS.inkSoft }} />}
        <GripVertical size={14} style={{ color: COLORS.border, cursor: "grab" }} />
      </div>
    </div>
  );
}
