import { CARD_SM, COLORS } from "@/lib/theme";
import { StatCard } from "@/components/ui/StatCard";
import type { Agent, LeadWithStatus } from "@/lib/types";

export function CommissionTab({ leads, agent }: { leads: LeadWithStatus[]; agent: Agent }) {
  const split = agent.commission_split || 70;
  const deals = leads.filter((l) => l.deal_value != null && (l.stage === "Under Contract" || l.stage === "Closed"));
  const pending = deals.filter((l) => l.stage === "Under Contract");
  const closed = deals.filter((l) => l.stage === "Closed");
  const sum = (arr: LeadWithStatus[]) => Math.round(arr.reduce((a, l) => a + Number(l.deal_value) * (split / 100), 0));

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-w-md">
        <StatCard label={`Pending (${pending.length} deals)`} value={sum(pending)} color={COLORS.warm} />
        <StatCard label={`Earned (${closed.length} deals)`} value={sum(closed)} color={COLORS.accentBright} />
      </div>
      <p className="text-xs mb-3" style={{ color: COLORS.inkSoft }}>
        Assumes your {split}% split, set in Settings. Net = gross commission entered on a lead × your split.
      </p>
      {deals.length === 0 ? (
        <p className="text-sm italic" style={{ color: COLORS.inkSoft }}>
          No deals with a commission value yet — add one from a lead&apos;s edit screen once it&apos;s under contract.
        </p>
      ) : (
        <div className="space-y-2 max-w-xl">
          {deals.map((l) => (
            <div key={l.id} className="mark flex items-center justify-between p-3.5 text-sm" style={CARD_SM}>
              <div>
                <p style={{ color: COLORS.ink }}>{l.name}</p>
                <p className="text-xs uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>
                  {l.stage}
                </p>
              </div>
              <div className="text-right">
                <p style={{ color: COLORS.ink, fontFamily: "'Space Mono', monospace" }}>${Number(l.deal_value).toLocaleString()} gross</p>
                <p className="text-xs" style={{ color: COLORS.accentBright, fontFamily: "'Space Mono', monospace" }}>
                  ${(Number(l.deal_value) * (split / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })} net
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
