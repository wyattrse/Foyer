"use client";

import { useState } from "react";
import { Check, Clock, DollarSign, Mail, MessageCircle, Pencil, Phone, RotateCcw, Trash2, X, BellRing } from "lucide-react";
import { CARD, CARD_SM, COLORS, inputStyle } from "@/lib/theme";
import { AGENT_OPTIONS, SOURCES, STAGES, TIMELINE_OPTIONS } from "@/lib/constants";
import { PrimaryButton, FieldLabel } from "@/components/ui/Basics";
import { Pill } from "@/components/ui/Basics";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { bucketColor, bucketOf, dueStatus, isActiveLead } from "@/lib/scoring";
import type { Interaction, LeadWithStatus, Template } from "@/lib/types";

interface EditData {
  name: string;
  phone: string;
  email: string;
  source: string;
  timeline: string;
  hasAgent: string;
  notes: string;
  dealValue: string;
}

export function LeadDetail({
  lead,
  interactions,
  templates,
  onClose,
  onUpdate,
  onLogInteraction,
  onDelete,
}: {
  lead: LeadWithStatus;
  interactions: Interaction[];
  templates: Template[];
  onClose: () => void;
  onUpdate: (patch: Record<string, unknown>, opts?: { silent?: boolean }) => void;
  onLogInteraction: (text: string) => void;
  onDelete: () => void;
}) {
  const [note, setNote] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [editingScore, setEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState(lead.effective_score);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<EditData | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const score = lead.effective_score;
  const bucket = bucketOf(score);
  const status = isActiveLead(lead) ? dueStatus(lead.next_touch_due) : null;

  const setF = (k: keyof EditData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditData((d) => (d ? { ...d, [k]: e.target.value } : d));

  const startEdit = () => {
    setEditData({
      name: lead.name,
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source,
      timeline: lead.timeline,
      hasAgent: lead.has_agent,
      notes: lead.notes || "",
      dealValue: lead.deal_value != null ? String(lead.deal_value) : "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!editData || !editData.name.trim()) return;
    onUpdate({
      name: editData.name.trim(),
      phone: editData.phone.trim() || null,
      email: editData.email.trim() || null,
      source: editData.source,
      timeline: editData.timeline,
      has_agent: editData.hasAgent,
      notes: editData.notes.trim() || null,
      deal_value: editData.dealValue === "" ? null : Number(editData.dealValue),
    });
    setEditing(false);
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t) setNote(t.body.replace(/\{name\}/g, lead.name));
  };

  const logInteraction = () => {
    if (!note.trim()) return;
    onLogInteraction(note.trim());
    setNote("");
    setTemplateId("");
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end anim-fadein" style={{ background: "#0A0A08AA", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="anim-slidein w-full max-w-md h-full overflow-y-auto p-6" style={{ background: COLORS.bg, borderLeft: `1px solid ${COLORS.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            {editing && editData ? (
              <input value={editData.name} onChange={setF("name")} className="text-xl w-full px-2 py-1 outline-none" style={{ ...inputStyle, fontFamily: "'Fraunces', serif" }} />
            ) : (
              <h2 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-xl truncate">
                {lead.name}
              </h2>
            )}
            <p className="text-xs mt-0.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
              {lead.source} · {new Date(lead.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {!editing && (
              <button onClick={startEdit} title="Edit lead" className="press w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70" style={{ color: COLORS.inkSoft }}>
                <Pencil size={16} />
              </button>
            )}
            <button onClick={onClose} className="press w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70" style={{ color: COLORS.inkSoft }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 mb-3" style={CARD}>
          <ScoreRing score={score} size={56} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill color={bucketColor(bucket)}>{bucket}</Pill>
              {lead.manual_score != null && (
                <span className="text-xs" style={{ color: COLORS.inkSoft }}>
                  overridden (auto: {lead.auto_score})
                </span>
              )}
            </div>
            {editingScore ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
                <button
                  onClick={() => {
                    onUpdate({ manual_score: Math.max(0, Math.min(100, scoreInput)) }, { silent: true });
                    setEditingScore(false);
                  }}
                  style={{ color: COLORS.accentBright }}
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => setEditingScore(true)} className="text-xs flex items-center gap-1" style={{ color: COLORS.accentBright }}>
                  <Pencil size={12} /> Override score
                </button>
                {lead.manual_score != null && (
                  <button onClick={() => onUpdate({ manual_score: null }, { silent: true })} className="text-xs flex items-center gap-1" style={{ color: COLORS.inkSoft }}>
                    <RotateCcw size={12} /> Reset to auto
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {isActiveLead(lead) && status && (
          <div
            className="flex items-center gap-2 mb-5 px-4 py-2.5 text-xs"
            style={{ ...CARD_SM, color: status === "overdue" ? COLORS.accentBright : status === "today" ? COLORS.warm : COLORS.inkSoft }}
          >
            <BellRing size={13} />
            {status === "overdue"
              ? `Follow-up overdue — was due ${new Date(lead.next_touch_due).toLocaleDateString()}`
              : status === "today"
                ? "Follow-up due today"
                : `Next follow-up due ${new Date(lead.next_touch_due).toLocaleDateString()}`}
          </div>
        )}

        {editing && editData ? (
          <div className="space-y-3 mb-5 p-4" style={CARD}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Phone</FieldLabel>
                <input value={editData.phone} onChange={setF("phone")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <input value={editData.email} onChange={setF("email")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle} />
              </div>
            </div>
            <div>
              <FieldLabel>Lead type (bin)</FieldLabel>
              <select value={editData.source} onChange={setF("source")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Timeline</FieldLabel>
                <select value={editData.timeline} onChange={setF("timeline")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle}>
                  {TIMELINE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Has an agent?</FieldLabel>
                <select value={editData.hasAgent} onChange={setF("hasAgent")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle}>
                  {AGENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <FieldLabel>Your gross commission on this deal ($)</FieldLabel>
              <input type="number" min="0" value={editData.dealValue} onChange={setF("dealValue")} placeholder="Only once under contract" className="w-full px-3 py-2 text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea value={editData.notes} onChange={setF("notes")} rows={2} className="w-full px-3 py-2 text-sm outline-none resize-none" style={inputStyle} />
            </div>
            <div className="flex gap-2 pt-1">
              <PrimaryButton onClick={saveEdit} className="flex-1">
                Save changes
              </PrimaryButton>
              <button onClick={() => setEditing(false)} className="press px-4 py-2 text-sm font-medium" style={{ color: COLORS.inkSoft }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-5 text-sm" style={{ color: COLORS.ink }}>
            {lead.phone && (
              <div className="flex items-center gap-2 flex-wrap">
                <Phone size={14} style={{ color: COLORS.inkSoft }} />
                <a href={`tel:${lead.phone}`} style={{ color: COLORS.ink, textDecoration: "underline", textDecorationColor: COLORS.border }}>
                  {lead.phone}
                </a>
                <a href={`sms:${lead.phone}`} className="text-xs flex items-center gap-1" style={{ color: COLORS.accentBright }}>
                  <MessageCircle size={12} /> Text
                </a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} style={{ color: COLORS.inkSoft }} />
                <a href={`mailto:${lead.email}`} style={{ color: COLORS.ink, textDecoration: "underline", textDecorationColor: COLORS.border }}>
                  {lead.email}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: COLORS.inkSoft }} /> {TIMELINE_OPTIONS.find((t) => t.value === lead.timeline)?.label}
            </div>
            {lead.deal_value != null && (
              <div className="flex items-center gap-2">
                <DollarSign size={14} style={{ color: COLORS.inkSoft }} /> ${Number(lead.deal_value).toLocaleString()} gross commission
              </div>
            )}
          </div>
        )}

        <div className="mb-5">
          <FieldLabel>Stage</FieldLabel>
          <select value={lead.stage} onChange={(e) => onUpdate({ stage: e.target.value }, { silent: true })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {!editing && lead.notes && (
          <div className="mb-5">
            <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>
              Notes
            </p>
            <p className="text-sm p-3.5" style={{ ...CARD_SM, color: COLORS.ink }}>
              {lead.notes}
            </p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>
            Interaction log
          </p>
          <div className="space-y-2 mb-3">
            {[...interactions].reverse().map((i) => (
              <div key={i.id} className="text-sm p-3" style={CARD_SM}>
                <p style={{ color: COLORS.ink }}>{i.text}</p>
                <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>
                  {new Date(i.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {interactions.length === 0 && (
              <p className="text-xs italic" style={{ color: COLORS.inkSoft }}>
                No touches logged yet.
              </p>
            )}
          </div>
          {templates.length > 0 && (
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} className="w-full mb-2 px-3 py-2 text-xs outline-none" style={inputStyle}>
              <option value="">Insert a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Log a call, text, or showing..."
              className="flex-1 px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && logInteraction()}
            />
            <PrimaryButton onClick={logInteraction} className="px-4">
              Log
            </PrimaryButton>
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-xs flex items-center gap-1.5" style={{ color: COLORS.accentBright }}>
              <Trash2 size={13} /> Delete lead
            </button>
          ) : (
            <div className="flex items-center gap-3 text-xs">
              <span style={{ color: COLORS.ink }}>Delete this lead?</span>
              <button onClick={onDelete} className="font-medium" style={{ color: COLORS.accentBright }}>
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)} style={{ color: COLORS.inkSoft }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
