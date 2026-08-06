"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { CARD, COLORS, inputStyle } from "@/lib/theme";
import { PrimaryButton, FieldLabel } from "@/components/ui/Basics";
import { NAV_DESTINATIONS, type NavKey } from "@/components/app/BottomNav";
import type { Agent } from "@/lib/types";

const UI_SCALES = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
] as const;

// `agent` is always loaded by the time this mounts (DashboardApp gates on it),
// and never switches to a *different* agent mid-session, so plain initial
// state is enough -- no need to re-sync via an effect.
export function SettingsTab({
  agent,
  onSave,
  onSignOut,
  themeMode,
  onThemeChange,
  uiScale,
  onUiScaleChange,
  bottomNavSlots,
  onBottomNavSlotsChange,
}: {
  agent: Agent;
  onSave: (patch: { name: string; brokerage: string; commission_split: number }) => void;
  onSignOut: () => void;
  themeMode: "dark" | "light";
  onThemeChange: (mode: "dark" | "light") => void;
  uiScale: "small" | "medium" | "large";
  onUiScaleChange: (scale: "small" | "medium" | "large") => void;
  bottomNavSlots: [NavKey, NavKey, NavKey];
  onBottomNavSlotsChange: (slots: [NavKey, NavKey, NavKey]) => void;
}) {
  const [form, setForm] = useState({
    name: agent.name,
    brokerage: agent.brokerage || "",
    commission_split: agent.commission_split,
  });

  return (
    <div className="max-w-md p-6" style={CARD}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.accentBright }}>
        Your profile
      </p>
      <div className="space-y-3">
        <div>
          <FieldLabel>Your name</FieldLabel>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Brokerage</FieldLabel>
          <input value={form.brokerage} onChange={(e) => setForm((f) => ({ ...f, brokerage: e.target.value }))} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Your commission split (%)</FieldLabel>
          <input
            type="number"
            min="0"
            max="100"
            value={form.commission_split}
            onChange={(e) => setForm((f) => ({ ...f, commission_split: Number(e.target.value) }))}
            className="w-full px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>
      <PrimaryButton onClick={() => onSave(form)} className="mt-4 px-4">
        Save
      </PrimaryButton>
      <p className="text-xs mt-4" style={{ color: COLORS.inkSoft }}>
        Multi-agent sign-in and team profiles are on the roadmap. For now this just personalizes your own dashboard.
      </p>

      <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <FieldLabel>Appearance</FieldLabel>
        <div className="flex gap-2">
          <button
            onClick={() => onThemeChange("dark")}
            className="press flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wide"
            style={{
              color: themeMode === "dark" ? "#FBF3EF" : COLORS.inkSoft,
              background: themeMode === "dark" ? COLORS.accent : COLORS.surface2,
              border: `1px solid ${themeMode === "dark" ? COLORS.accent : COLORS.border}`,
              borderRadius: 5,
            }}
          >
            <Moon size={13} /> Dark
          </button>
          <button
            onClick={() => onThemeChange("light")}
            className="press flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wide"
            style={{
              color: themeMode === "light" ? "#FBF3EF" : COLORS.inkSoft,
              background: themeMode === "light" ? COLORS.accent : COLORS.surface2,
              border: `1px solid ${themeMode === "light" ? COLORS.accent : COLORS.border}`,
              borderRadius: 5,
            }}
          >
            <Sun size={13} /> Light
          </button>
        </div>
      </div>

      <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <FieldLabel>Text &amp; spacing size</FieldLabel>
        <p className="text-xs mb-3" style={{ color: COLORS.inkSoft }}>
          Scales text, padding, and tap targets together across the whole app — on your phone and here.
        </p>
        <div className="flex gap-2">
          {UI_SCALES.map((s) => (
            <button
              key={s.key}
              onClick={() => onUiScaleChange(s.key)}
              className="press flex-1 px-3 py-2 text-xs font-medium uppercase tracking-wide"
              style={{
                color: uiScale === s.key ? "#FBF3EF" : COLORS.inkSoft,
                background: uiScale === s.key ? COLORS.accent : COLORS.surface2,
                border: `1px solid ${uiScale === s.key ? COLORS.accent : COLORS.border}`,
                borderRadius: 5,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 sm:hidden" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <FieldLabel>Bottom navigation</FieldLabel>
        <p className="text-xs mb-3" style={{ color: COLORS.inkSoft }}>
          Choose the 3 tabs that sit next to Add on your phone. Anything else is one tap away under More.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([0, 1, 2] as const).map((i) => (
            <select
              key={i}
              value={bottomNavSlots[i]}
              onChange={(e) => {
                const next = [...bottomNavSlots] as [NavKey, NavKey, NavKey];
                next[i] = e.target.value as NavKey;
                onBottomNavSlotsChange(next);
              }}
              className="w-full px-2 py-2.5 text-xs outline-none"
              style={inputStyle}
            >
              {NAV_DESTINATIONS.map((d) => (
                <option key={d.key} value={d.key} disabled={bottomNavSlots.some((slot, j) => j !== i && slot === d.key)}>
                  {d.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <button onClick={onSignOut} className="mt-6 text-xs uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
        Sign out
      </button>
    </div>
  );
}
