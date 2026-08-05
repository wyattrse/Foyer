import { useId } from "react";
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
  const uid = useId().replace(/:/g, "");
  const big = size === "lg";
  const px = big ? 68 : 24;
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width={px} height={px} viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id={`${uid}-ink`} gradientUnits="userSpaceOnUse" x1="8" y1="6" x2="8" y2="34">
            <stop offset="0%" stopColor="#FFFDF8" />
            <stop offset="55%" stopColor={ink} />
            <stop offset="100%" stopColor={ink} />
          </linearGradient>
          <linearGradient id={`${uid}-accent`} gradientUnits="userSpaceOnUse" x1="8" y1="6" x2="21" y2="20">
            <stop offset="0%" stopColor={COLORS.accentBright} />
            <stop offset="60%" stopColor={COLORS.accent} />
            <stop offset="100%" stopColor="#8E2A20" />
          </linearGradient>
          <linearGradient id={`${uid}-arc`} gradientUnits="userSpaceOnUse" x1="19" y1="6" x2="19" y2="34">
            <stop offset="0%" stopColor="#9A927E" />
            <stop offset="100%" stopColor={arc} />
          </linearGradient>
        </defs>
        <g>
          <path d="M8 34 A28 28 0 0 0 30 20" stroke={`url(#${uid}-arc)`} strokeWidth={big ? 2 : 1.5} fill="none" />
          <path d="M8 6 L8 34" stroke={`url(#${uid}-ink)`} strokeWidth={big ? 3 : 2.5} strokeLinecap="round" />
          <path d="M8 6 L30 20" stroke={`url(#${uid}-accent)`} strokeWidth={big ? 3 : 2.5} strokeLinecap="round" />
        </g>
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
