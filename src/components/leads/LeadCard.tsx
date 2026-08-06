import { AlertCircle, GripVertical, Mail, Pencil, Phone } from "lucide-react";
import { CARD_SM, COLORS, alpha } from "@/lib/theme";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { dueStatus } from "@/lib/scoring";
import type { LeadWithStatus } from "@/lib/types";

export function LeadCard({
  lead,
  onClick,
  dragProps,
  delay = 0,
  highlighted = false,
}: {
  lead: LeadWithStatus;
  onClick: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
  delay?: number;
  highlighted?: boolean;
}) {
  const status = lead.is_active ? dueStatus(lead.next_touch_due) : null;
  return (
    <div
      {...dragProps}
      onClick={onClick}
      className={`mark anim-fadeup w-full text-left p-4 sm:p-3.5 mb-2.5 cursor-pointer ${highlighted ? "ai-glow" : ""}`}
      style={{ ...CARD_SM, borderColor: status === "overdue" ? alpha(COLORS.accentBright, 44) : COLORS.border, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <ScoreRing score={lead.effective_score} size={42} />
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-sm font-medium truncate" style={{ color: COLORS.ink }}>
            {lead.name}
          </p>
          <p className="text-xs truncate uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 11 }}>
            {lead.stage}
          </p>
        </div>
        {status === "overdue" && <AlertCircle size={13} style={{ color: COLORS.accentBright }} />}
        {lead.manual_score != null && <Pencil size={11} style={{ color: COLORS.inkSoft }} />}
        <GripVertical size={14} style={{ color: COLORS.border, cursor: "grab" }} />
      </div>
      {(lead.email || lead.phone) && (
        <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {lead.email ? <Mail size={11} style={{ color: COLORS.inkSoft, flexShrink: 0 }} /> : <Phone size={11} style={{ color: COLORS.inkSoft, flexShrink: 0 }} />}
          <span className="text-xs truncate" style={{ color: COLORS.inkSoft }}>
            {lead.email || lead.phone}
          </span>
        </div>
      )}
    </div>
  );
}
