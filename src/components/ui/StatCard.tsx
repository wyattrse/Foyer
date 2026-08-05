"use client";

import { CARD, COLORS } from "@/lib/theme";
import { useCountUp } from "@/hooks/useCountUp";

export function StatCard({
  label: lbl,
  value,
  color,
  delay = 0,
}: {
  label: string;
  value: number | string;
  color?: string;
  delay?: number;
}) {
  const animated = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div className="mark anim-fadeup p-4" style={{ ...CARD, animationDelay: `${delay}ms` }}>
      <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>
        {lbl}
      </p>
      <p className="text-2xl" style={{ color: color || COLORS.ink, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
        {typeof value === "number" ? animated : value}
      </p>
    </div>
  );
}
