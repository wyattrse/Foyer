"use client";

import { useRef, useState } from "react";
import { Moon, Sun, Upload, Check, Copy, ExternalLink } from "lucide-react";
import { CARD, CARD_SM, COLORS, inputStyle } from "@/lib/theme";
import { PrimaryButton, FieldLabel } from "@/components/ui/Basics";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
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
  onUploadPhoto,
  onUploadLogo,
}: {
  agent: Agent;
  onSave: (patch: { name: string; brokerage: string; commission_split: number; phone: string; email: string }) => void;
  onSignOut: () => void;
  themeMode: "dark" | "light";
  onThemeChange: (mode: "dark" | "light") => void;
  uiScale: "small" | "medium" | "large";
  onUiScaleChange: (scale: "small" | "medium" | "large") => void;
  bottomNavSlots: [NavKey, NavKey, NavKey];
  onBottomNavSlotsChange: (slots: [NavKey, NavKey, NavKey]) => void;
  onUploadPhoto: (file: File) => Promise<void>;
  onUploadLogo: (file: File) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: agent.name,
    brokerage: agent.brokerage || "",
    commission_split: agent.commission_split,
    phone: agent.phone || "",
    email: agent.email || "",
  });
  const [uploading, setUploading] = useState<"photo" | "logo" | null>(null);
  const [copied, setCopied] = useState(false);
  const [cropTarget, setCropTarget] = useState<{ kind: "photo" | "logo"; file: File } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const cardUrl = typeof window !== "undefined" ? `${window.location.origin}/card/${agent.id}` : `/card/${agent.id}`;

  const handleUpload = async (kind: "photo" | "logo", file: File | Blob) => {
    setUploading(kind);
    try {
      const asFile = file instanceof File ? file : new File([file], `${kind}.png`, { type: "image/png" });
      await (kind === "photo" ? onUploadPhoto(asFile) : onUploadLogo(asFile));
    } finally {
      setUploading(null);
    }
  };

  const copyCardUrl = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable -- the link is still
      // visible and selectable, so this isn't fatal.
    }
  };

  return (
    <div className="max-w-md p-6" style={CARD}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.accentBright }}>
        Your profile
      </p>

      <div className="flex items-center gap-4 mb-5">
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => photoInputRef.current?.click()}
            className="press w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}` }}
          >
            {agent.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- agent-controlled Storage URL, not an optimizable static asset
              <img src={agent.photo_url} alt="Your photo" className="w-full h-full object-cover" />
            ) : (
              <Upload size={18} style={{ color: COLORS.inkSoft }} />
            )}
          </button>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
            {uploading === "photo" ? "Uploading…" : "Photo"}
          </span>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setCropTarget({ kind: "photo", file });
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => logoInputRef.current?.click()}
            className="press w-24 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}` }}
          >
            {agent.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- agent-controlled Storage URL, not an optimizable static asset
              <img src={agent.logo_url} alt="Brokerage logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Upload size={18} style={{ color: COLORS.inkSoft }} />
            )}
          </button>
          <span className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
            {uploading === "logo" ? "Uploading…" : "Brokerage logo"}
          </span>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setCropTarget({ kind: "logo", file });
              e.target.value = "";
            }}
          />
        </div>
      </div>

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
        <div className="pt-2">
          <FieldLabel>Contact card (shown on your Open House QR code)</FieldLabel>
          <p className="text-xs mb-2" style={{ color: COLORS.inkSoft }}>
            Visitors scan the kiosk QR to save you as a contact. Fill these in so it&apos;s more than just your name.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>
        </div>
      </div>
      <PrimaryButton onClick={() => onSave(form)} className="mt-4 px-4">
        Save
      </PrimaryButton>
      <p className="text-xs mt-4" style={{ color: COLORS.inkSoft }}>
        Multi-agent sign-in and team profiles are on the roadmap. For now this just personalizes your own dashboard.
      </p>

      <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <FieldLabel>Digital business card</FieldLabel>
        <p className="text-xs mb-3" style={{ color: COLORS.inkSoft }}>
          A shareable page with your photo, brokerage, and a Save Contact button — text it, email it, or drop it in your signature.
        </p>
        <div className="flex items-center gap-2 mb-2 p-2.5" style={{ ...CARD_SM, overflow: "hidden" }}>
          <span className="flex-1 text-xs truncate" style={{ color: COLORS.inkSoft }}>
            {cardUrl}
          </span>
          <button onClick={copyCardUrl} title="Copy link" className="press flex-shrink-0" style={{ color: copied ? COLORS.accent : COLORS.inkSoft }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <a href={`/card/${agent.id}`} target="_blank" rel="noopener noreferrer" title="Open in new tab" className="press flex-shrink-0" style={{ color: COLORS.inkSoft }}>
            <ExternalLink size={15} />
          </a>
        </div>
      </div>

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

      {cropTarget && (
        <ImageCropModal
          file={cropTarget.file}
          aspect={cropTarget.kind === "photo" ? 1 : 2.4}
          shape={cropTarget.kind === "photo" ? "circle" : "rect"}
          title={cropTarget.kind === "photo" ? "Frame your photo" : "Frame your logo"}
          onCancel={() => setCropTarget(null)}
          onConfirm={(blob) => {
            handleUpload(cropTarget.kind, blob);
            setCropTarget(null);
          }}
        />
      )}
    </div>
  );
}
