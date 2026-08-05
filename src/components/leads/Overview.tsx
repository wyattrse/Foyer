import { Download } from "lucide-react";
import { CARD, COLORS } from "@/lib/theme";
import { SOURCES } from "@/lib/constants";
import { StatCard } from "@/components/ui/StatCard";
import { dueStatus, exportLeadsCSV } from "@/lib/scoring";
import type { LeadWithStatus } from "@/lib/types";

export function Overview({ leads }: { leads: LeadWithStatus[] }) {
  const total = leads.length;
  const counts = { hot: 0, warm: 0, cold: 0 };
  leads.forEach((l) => counts[l.bucket]++);
  const overdueCount = leads.filter((l) => l.is_active && dueStatus(l.next_touch_due) === "overdue").length;
  const bySource = SOURCES.map((s) => ({ source: s, count: leads.filter((l) => l.source === s).length }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
          Snapshot
        </p>
        <button
          onClick={() => exportLeadsCSV(leads)}
          disabled={total === 0}
          className="press flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide disabled:opacity-40"
          style={{ color: COLORS.accentBright }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total leads" value={total} delay={0} />
        <StatCard label="Hot" value={counts.hot} color={COLORS.accentBright} delay={40} />
        <StatCard label="Warm" value={counts.warm} color={COLORS.warm} delay={80} />
        <StatCard label="Cold" value={counts.cold} color={COLORS.cold} delay={120} />
        <StatCard label="Overdue follow-ups" value={overdueCount} color={overdueCount > 0 ? COLORS.accentBright : COLORS.ink} delay={160} />
      </div>
      <div className="anim-fadeup p-5" style={{ ...CARD, animationDelay: "200ms" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLORS.inkSoft }}>
          By lead type
        </p>
        <div className="space-y-2.5">
          {bySource.map(({ source, count }) => (
            <div key={source} className="flex items-center gap-3">
              <span className="text-sm w-32" style={{ color: COLORS.ink }}>
                {source}
              </span>
              <div className="flex-1 h-1.5" style={{ background: COLORS.surface2, borderRadius: 2 }}>
                <div className="h-1.5 transition-all duration-700" style={{ width: total ? `${(count / total) * 100}%` : 0, background: COLORS.accent, borderRadius: 2 }} />
              </div>
              <span className="text-xs w-6 text-right" style={{ color: COLORS.inkSoft, fontFamily: "'Space Mono', monospace" }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
