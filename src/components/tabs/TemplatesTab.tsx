"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { CARD_SM, COLORS, inputStyle } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/Basics";
import type { Template } from "@/lib/types";

export function TemplatesTab({
  templates,
  onAdd,
  onUpdate,
  onDelete,
}: {
  templates: Template[];
  onAdd: (form: { title: string; body: string }) => void;
  onUpdate: (id: string, form: { title: string; body: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", body: "" });

  const submitNew = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    onAdd(form);
    setForm({ title: "", body: "" });
    setAdding(false);
  };
  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setEditForm({ title: t.title, body: t.body });
  };
  const saveEdit = (id: string) => {
    onUpdate(id, editForm);
    setEditingId(null);
  };

  return (
    <div className="max-w-xl">
      <p className="text-xs mb-4" style={{ color: COLORS.inkSoft }}>
        Use <code>{"{name}"}</code> and it&apos;ll be swapped for the lead&apos;s name when you insert it into a follow-up.
      </p>
      <div className="space-y-2 mb-4">
        {templates.map((t, idx) => (
          <div key={t.id} className="mark anim-fadeup p-4" style={{ ...CARD_SM, animationDelay: `${idx * 40}ms` }}>
            {editingId === t.id ? (
              <div className="space-y-2">
                <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 text-sm outline-none font-medium" style={inputStyle} />
                <textarea value={editForm.body} onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm outline-none resize-none" style={inputStyle} />
                <div className="flex gap-2">
                  <PrimaryButton onClick={() => saveEdit(t.id)} className="px-3 py-1.5 text-xs">
                    Save
                  </PrimaryButton>
                  <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: COLORS.inkSoft }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium" style={{ color: COLORS.ink }}>
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button onClick={() => startEdit(t)} style={{ color: COLORS.inkSoft }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(t.id)} style={{ color: COLORS.accentBright }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs" style={{ color: COLORS.inkSoft }}>
                  {t.body}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
      {adding ? (
        <div className="p-4 space-y-2" style={CARD_SM}>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Template name" className="w-full px-3 py-2 text-sm outline-none" style={inputStyle} />
          <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={3} placeholder="Hi {name}, ..." className="w-full px-3 py-2 text-sm outline-none resize-none" style={inputStyle} />
          <div className="flex gap-2">
            <PrimaryButton onClick={submitNew} className="px-3 py-1.5 text-xs">
              Add template
            </PrimaryButton>
            <button onClick={() => setAdding(false)} className="text-xs" style={{ color: COLORS.inkSoft }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="press flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.accentBright }}>
          <Plus size={14} /> New template
        </button>
      )}
    </div>
  );
}
