"use client";

import { useState } from "react";
import { COLORS, KIOSK, CARD_SM, inputStyle } from "@/lib/theme";
import { AGENT_OPTIONS, SOURCES, TIMELINE_OPTIONS } from "@/lib/constants";
import { PrimaryButton } from "@/components/ui/Basics";
import type { LeadFormValues, LeadWithStatus } from "@/lib/types";

// `light` renders the client-facing (kiosk) theme. `checkDuplicate`/`onViewExisting`
// are only passed for the agent-facing Quick Add flow -- kiosk sign-ins skip the
// duplicate check entirely so a client is never shown backend data-quality prompts.
export function LeadForm({
  mode,
  onSubmit,
  onCancel,
  light = false,
  checkDuplicate,
  onViewExisting,
}: {
  mode: "capture" | "add";
  onSubmit: (form: LeadFormValues) => void;
  onCancel?: () => void;
  light?: boolean;
  checkDuplicate?: (form: LeadFormValues) => LeadWithStatus | null;
  onViewExisting?: (lead: LeadWithStatus) => void;
}) {
  const isCapture = mode === "capture";
  const [form, setForm] = useState<LeadFormValues>({
    name: "",
    phone: "",
    email: "",
    source: isCapture ? "Open House" : "Referral",
    timeline: "1-3",
    hasAgent: "unsure",
    notes: "",
  });
  const [touched, setTouched] = useState(false);
  const [dup, setDup] = useState<LeadWithStatus | null>(null);

  const set = (k: keyof LeadFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }) as LeadFormValues);
    if (k === "phone" || k === "email") setDup(null);
  };

  const submit = (force = false) => {
    setTouched(true);
    if (!form.name.trim()) return;
    if (!force && checkDuplicate) {
      const match = checkDuplicate(form);
      if (match) {
        setDup(match);
        return;
      }
    }
    onSubmit(form);
  };

  const t = light
    ? {
        input: { background: KIOSK.input, border: `1px solid ${KIOSK.border}`, color: KIOSK.ink, borderRadius: 5 },
        labelColor: KIOSK.soft,
        errColor: COLORS.accent,
        cancelColor: KIOSK.soft,
        border: KIOSK.border,
      }
    : {
        input: inputStyle,
        labelColor: COLORS.inkSoft,
        errColor: COLORS.accentBright,
        cancelColor: COLORS.inkSoft,
        border: COLORS.border,
      };
  const lbl = (children: React.ReactNode) => (
    <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: t.labelColor, fontSize: 10.5 }}>
      {children}
    </label>
  );

  return (
    <div className="space-y-4">
      <div>
        {lbl(
          <>
            Name {touched && !form.name.trim() && <span style={{ color: t.errColor }}>— required</span>}
          </>,
        )}
        <input
          autoFocus
          value={form.name}
          onChange={set("name")}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Visitor's name"
          className="w-full px-3 py-2.5 text-sm outline-none"
          style={{ ...t.input, borderColor: touched && !form.name.trim() ? t.errColor : t.border }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          {lbl("Phone")}
          <input value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" className="w-full px-3 py-2.5 text-sm outline-none" style={t.input} />
        </div>
        <div>
          {lbl("Email")}
          <input value={form.email} onChange={set("email")} placeholder="name@email.com" className="w-full px-3 py-2.5 text-sm outline-none" style={t.input} />
        </div>
      </div>
      {!isCapture && (
        <div>
          {lbl("Lead type")}
          <select value={form.source} onChange={set("source")} className="w-full px-3 py-2.5 text-sm outline-none" style={t.input}>
            {SOURCES.filter((s) => s !== "Open House").map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          {lbl("Buying timeline")}
          <select value={form.timeline} onChange={set("timeline")} className="w-full px-3 py-2.5 text-sm outline-none" style={t.input}>
            {TIMELINE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          {lbl("Has an agent?")}
          <select value={form.hasAgent} onChange={set("hasAgent")} className="w-full px-3 py-2.5 text-sm outline-none" style={t.input}>
            {AGENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        {lbl("Notes")}
        <textarea
          value={form.notes}
          onChange={set("notes")}
          rows={2}
          placeholder={isCapture ? "Loved the kitchen, worried about commute..." : "How you met, context..."}
          className="w-full px-3 py-2.5 text-sm outline-none resize-none"
          style={t.input}
        />
      </div>

      {dup && (
        <div className="p-3 text-xs" style={{ ...CARD_SM, borderColor: COLORS.accent + "80" }}>
          <p style={{ color: COLORS.ink }}>
            This might already be <strong>{dup.name}</strong> ({dup.phone || dup.email}), added {new Date(dup.created_at).toLocaleDateString()}.
          </p>
          <div className="flex gap-4 mt-2">
            <button type="button" onClick={() => onViewExisting?.(dup)} className="font-medium uppercase tracking-wide" style={{ color: COLORS.accentBright }}>
              View existing
            </button>
            <button type="button" onClick={() => submit(true)} className="uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
              Add as new anyway
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <PrimaryButton onClick={() => submit()} className="flex-1" style={light ? { background: COLORS.accent } : {}}>
          {isCapture ? "Sign in" : "Add lead"}
        </PrimaryButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className="press px-4 py-2 text-sm font-medium" style={{ color: t.cancelColor }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
