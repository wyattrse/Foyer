"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";
import { CARD, CARD_SM, COLORS, alpha, inputStyle } from "@/lib/theme";
import { PrimaryButton, FieldLabel } from "@/components/ui/Basics";
import type { CalendarEvent, LeadWithStatus, Listing } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toLocalDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface EventForm {
  title: string;
  date: string;
  time: string;
  notes: string;
  leadId: string;
  listingId: string;
}

const emptyForm = (date: string): EventForm => ({ title: "", date, time: "09:00", notes: "", leadId: "", listingId: "" });

export function CalendarTab({
  events,
  leads,
  listings,
  highlightedEventId,
  onAdd,
  onUpdate,
  onDelete,
}: {
  events: CalendarEvent[];
  leads: LeadWithStatus[];
  listings: Listing[];
  highlightedEventId?: string | null;
  onAdd: (form: { title: string; notes: string | null; startAt: string; endAt: string | null; leadId: string | null; listingId: string | null }) => void;
  onUpdate: (id: string, form: { title: string; notes: string | null; startAt: string; endAt: string | null; leadId: string | null; listingId: string | null }) => void;
  onDelete: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [editing, setEditing] = useState<{ id: string | null; form: EventForm } | null>(null);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = toLocalDateInput(new Date(ev.start_at));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const today = new Date();

  const openNew = (date: Date) => setEditing({ id: null, form: emptyForm(toLocalDateInput(date)) });
  const openExisting = (ev: CalendarEvent) => {
    const start = new Date(ev.start_at);
    setEditing({
      id: ev.id,
      form: {
        title: ev.title,
        date: toLocalDateInput(start),
        time: toLocalTimeInput(start),
        notes: ev.notes ?? "",
        leadId: ev.lead_id ?? "",
        listingId: ev.listing_id ?? "",
      },
    });
  };

  const save = () => {
    if (!editing || !editing.form.title.trim() || !editing.form.date) return;
    const startAt = new Date(`${editing.form.date}T${editing.form.time || "09:00"}`).toISOString();
    const payload = {
      title: editing.form.title.trim(),
      notes: editing.form.notes.trim() || null,
      startAt,
      endAt: null,
      leadId: editing.form.leadId || null,
      listingId: editing.form.listingId || null,
    };
    if (editing.id) onUpdate(editing.id, payload);
    else onAdd(payload);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="press w-7 h-7 flex items-center justify-center" style={{ color: COLORS.inkSoft }}>
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-semibold w-36 text-center" style={{ color: COLORS.ink }}>
            {monthLabel}
          </p>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="press w-7 h-7 flex items-center justify-center" style={{ color: COLORS.inkSoft }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setCursor(new Date())} className="press text-xs font-medium uppercase tracking-wide ml-1" style={{ color: COLORS.accentBright }}>
            Today
          </button>
        </div>
        <button onClick={() => openNew(today)} className="press flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.accentBright }}>
          <Plus size={14} /> New event
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <p key={d} className="text-xs font-semibold uppercase tracking-wide text-center py-1" style={{ color: COLORS.inkSoft }}>
            {d}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const dayEvents = eventsByDay.get(toLocalDateInput(d)) ?? [];
          return (
            <div
              key={i}
              onClick={() => openNew(d)}
              className="min-h-[74px] sm:min-h-[92px] p-1.5 cursor-pointer press"
              style={{
                background: inMonth ? COLORS.surface2 : "transparent",
                border: `1px solid ${isToday ? COLORS.accent : COLORS.border}`,
                borderRadius: 6,
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <p className="text-xs mb-1" style={{ color: isToday ? COLORS.accentBright : COLORS.inkSoft, fontWeight: isToday ? 700 : 400 }}>
                {d.getDate()}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      openExisting(ev);
                    }}
                    className={`text-[10px] sm:text-xs truncate px-1 py-0.5 ${ev.id === highlightedEventId ? "ai-glow" : ""}`}
                    style={{ background: alpha(COLORS.ai, 20), color: COLORS.ink, borderRadius: 3 }}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fadein" onClick={() => setEditing(null)}>
          <div className="absolute inset-0" style={{ background: "#0A0A08CC", backdropFilter: "blur(3px)" }} />
          <div className="anim-popin relative w-full max-w-sm p-5" style={CARD} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>
                {editing.id ? "Edit event" : "New event"}
              </p>
              <button onClick={() => setEditing(null)} style={{ color: COLORS.inkSoft }}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <FieldLabel>Title</FieldLabel>
                <input
                  autoFocus
                  value={editing.form.title}
                  onChange={(e) => setEditing((s) => (s ? { ...s, form: { ...s.form, title: e.target.value } } : s))}
                  placeholder="Showing at 123 Main St"
                  className="w-full px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <input
                    type="date"
                    value={editing.form.date}
                    onChange={(e) => setEditing((s) => (s ? { ...s, form: { ...s.form, date: e.target.value } } : s))}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>Time</FieldLabel>
                  <input
                    type="time"
                    value={editing.form.time}
                    onChange={(e) => setEditing((s) => (s ? { ...s, form: { ...s.form, time: e.target.value } } : s))}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Linked lead (optional)</FieldLabel>
                <select
                  value={editing.form.leadId}
                  onChange={(e) => setEditing((s) => (s ? { ...s, form: { ...s.form, leadId: e.target.value } } : s))}
                  className="w-full px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Linked listing (optional)</FieldLabel>
                <select
                  value={editing.form.listingId}
                  onChange={(e) => setEditing((s) => (s ? { ...s, form: { ...s.form, listingId: e.target.value } } : s))}
                  className="w-full px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.address}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  value={editing.form.notes}
                  onChange={(e) => setEditing((s) => (s ? { ...s, form: { ...s.form, notes: e.target.value } } : s))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <PrimaryButton onClick={save} className="flex-1">
                  {editing.id ? "Save changes" : "Add event"}
                </PrimaryButton>
                {editing.id && (
                  <button
                    onClick={() => {
                      onDelete(editing.id!);
                      setEditing(null);
                    }}
                    className="press px-3"
                    style={{ ...CARD_SM, color: COLORS.accentBright }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
