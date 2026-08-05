import { COLORS } from "@/lib/theme";
import { bucketColor, bucketOf } from "@/lib/scoring";

export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const color = bucketColor(bucketOf(score));
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.border} strokeWidth="3.5" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="3.5"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Mono', monospace",
          fontSize: size * 0.26,
          fontWeight: 700,
          color: COLORS.ink,
        }}
      >
        {score}
      </div>
    </div>
  );
}
