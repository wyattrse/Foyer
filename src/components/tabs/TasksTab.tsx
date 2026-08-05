"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { CARD_SM, COLORS, inputStyle } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/Basics";
import type { Task } from "@/lib/types";

export function TasksTab({
  tasks,
  onAdd,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  return (
    <div className="max-w-lg">
      <div className="flex gap-2 mb-5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Follow up with the Garcias, order signs..."
          className="flex-1 px-3 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
        <PrimaryButton onClick={submit} className="px-4 flex items-center gap-1">
          <Plus size={14} /> Add
        </PrimaryButton>
      </div>
      <div className="space-y-2 mb-6">
        {open.length === 0 && (
          <p className="text-xs italic" style={{ color: COLORS.inkSoft }}>
            Nothing pending — nice.
          </p>
        )}
        {open.map((t, idx) => (
          <div key={t.id} className="mark anim-fadeup flex items-center gap-3 p-3" style={{ ...CARD_SM, animationDelay: `${idx * 30}ms` }}>
            <button onClick={() => onToggle(t.id)} className="press w-4 h-4 rounded-full flex-shrink-0" style={{ border: `2px solid ${COLORS.accent}` }} />
            <span className="flex-1 text-sm" style={{ color: COLORS.ink }}>
              {t.text}
            </span>
            <button onClick={() => onDelete(t.id)} style={{ color: COLORS.inkSoft }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.inkSoft }}>
            Done
          </p>
          <div className="space-y-2">
            {done.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 opacity-60" style={CARD_SM}>
                <button onClick={() => onToggle(t.id)} className="press w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: COLORS.accent }}>
                  <Check size={11} color="#fff" />
                </button>
                <span className="flex-1 text-sm line-through" style={{ color: COLORS.inkSoft }}>
                  {t.text}
                </span>
                <button onClick={() => onDelete(t.id)} style={{ color: COLORS.inkSoft }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
