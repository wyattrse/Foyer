import { COLORS } from "@/lib/theme";

export function BrandMark({
  size = "sm",
  ink = COLORS.ink,
  arc = COLORS.borderStrong,
}: {
  size?: "sm" | "lg";
  ink?: string;
  arc?: string;
}) {
  const big = size === "lg";
  const px = big ? 68 : 24;
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width={px} height={px} viewBox="0 0 40 40" fill="none">
        <path d="M5 34 L33 34" stroke={arc} strokeWidth={big ? 2 : 1.5} strokeLinecap="round" />
        <path d="M8 6 L8 34" stroke={ink} strokeWidth={big ? 3 : 2.5} strokeLinecap="round" />
        <path d="M8 6 L29 19" stroke={COLORS.accent} strokeWidth={big ? 3 : 2.5} strokeLinecap="round" />
        <circle cx="23.5" cy="15.6" r={big ? 1.8 : 1.4} fill={COLORS.accent} />
        <path d="M8 34 A27 27 0 0 0 29 19" stroke={arc} strokeWidth={big ? 2 : 1.5} fill="none" />
      </svg>
      <span
        style={{
          fontFamily: "'Fraunces', serif",
          color: ink,
          fontSize: big ? 36 : 19,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        Foyer
      </span>
    </div>
  );
}
