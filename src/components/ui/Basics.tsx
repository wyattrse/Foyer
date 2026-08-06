import type { ReactNode } from "react";
import { COLORS, alpha } from "@/lib/theme";

export function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      className="px-2 py-0.5 text-xs font-medium uppercase tracking-wide"
      style={{ background: alpha(color, 12), color, border: `1px solid ${alpha(color, 33)}`, borderRadius: 4 }}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  style,
  className = "",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`press py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 ${className}`}
      style={{ background: COLORS.accent, color: "#FBF3EF", borderRadius: 5, ...style }}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className="block text-xs font-medium mb-1 uppercase tracking-wide"
      style={{ color: COLORS.inkSoft, fontSize: 10.5 }}
    >
      {children}
    </label>
  );
}
