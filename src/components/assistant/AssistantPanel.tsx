"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Check, ArrowUp, Loader2, TriangleAlert } from "lucide-react";
import { COLORS, alpha, inputStyle } from "@/lib/theme";
import { TIMELINE_OPTIONS, AGENT_OPTIONS } from "@/lib/constants";
import { canConvertToPdf } from "@/lib/pdfConvert";
import type { CalendarEvent, FileRecord, Lead, LeadFormValues, LeadWithStatus, Listing, Task, Template } from "@/lib/types";

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

type PendingStatus = "pending" | "approved" | "rejected";

interface PendingAction {
  name: string;
  args: Record<string, unknown>;
  status: PendingStatus;
  // Snapshotted once when the action is proposed -- looking these up live
  // at render time breaks after a delete removes the referenced record.
  fields: { label: string; value: string }[];
}

type ChatMessage =
  | { kind: "text"; role: "user" | "assistant"; text: string }
  | { kind: "actions"; actions: PendingAction[] }
  | { kind: "error"; text: string };

const DESTRUCTIVE_ACTIONS = new Set(["delete_lead", "delete_listing", "delete_task", "delete_template", "delete_event", "delete_file"]);
const PERMANENT_ACTIONS = new Set(["delete_listing", "delete_task", "delete_template", "delete_event", "delete_file"]);

function timelineLabel(v: unknown) {
  return TIMELINE_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
}
function hasAgentLabel(v: unknown) {
  return AGENT_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
}

function actionTitle(name: string) {
  switch (name) {
    case "create_lead":
      return "Create lead";
    case "update_lead":
      return "Update lead";
    case "delete_lead":
      return "Remove lead";
    case "log_interaction":
      return "Log interaction";
    case "create_listing":
      return "Create listing";
    case "update_listing":
      return "Update listing";
    case "delete_listing":
      return "Delete listing";
    case "create_task":
      return "Add task";
    case "complete_task":
      return "Complete task";
    case "delete_task":
      return "Delete task";
    case "create_template":
      return "Create template";
    case "update_template":
      return "Update template";
    case "delete_template":
      return "Delete template";
    case "create_event":
      return "Create event";
    case "update_event":
      return "Update event";
    case "delete_event":
      return "Delete event";
    case "attach_file_to_lead":
      return "Attach file";
    case "rename_file":
      return "Rename file";
    case "delete_file":
      return "Delete file";
    case "convert_file_to_pdf":
      return "Convert to PDF";
    default:
      return name;
  }
}

function describeFields(
  name: string,
  args: Record<string, unknown>,
  leads: LeadWithStatus[],
  listings: Listing[],
  tasks: Task[],
  templates: Template[],
  events: CalendarEvent[],
  files: FileRecord[],
): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown, format?: (v: unknown) => string) => {
    if (value === undefined || value === null || value === "") return;
    fields.push({ label, value: format ? format(value) : String(value) });
  };

  if (name === "create_lead" || name === "update_lead" || name === "delete_lead" || name === "log_interaction") {
    if (name !== "create_lead") {
      const existing = leads.find((l) => l.id === args.leadId);
      push("Lead", existing?.name ?? String(args.leadId));
    } else {
      push("Name", args.name);
    }
    push("Phone", args.phone);
    push("Email", args.email);
    push("Source", args.source);
    push("Timeline", args.timeline, timelineLabel);
    push("Has agent", args.hasAgent, hasAgentLabel);
    push("Stage", args.stage);
    push("Notes", args.notes);
    push("Note", args.text);
  } else if (name === "create_listing" || name === "update_listing" || name === "delete_listing") {
    if (name !== "create_listing") {
      const existing = listings.find((l) => l.id === args.listingId);
      push("Listing", existing?.address ?? String(args.listingId));
    }
    push("Address", args.address);
    push("Price", args.price, (v) => `$${Number(v).toLocaleString()}`);
    push("Type", args.agreementType);
    push("Description", args.description);
  } else if (name === "create_task" || name === "complete_task" || name === "delete_task") {
    if (name === "create_task") {
      push("Task", args.text);
    } else {
      const existing = tasks.find((t) => t.id === args.taskId);
      push("Task", existing?.text ?? String(args.taskId));
    }
  } else if (name === "create_template" || name === "update_template" || name === "delete_template") {
    if (name !== "create_template") {
      const existing = templates.find((t) => t.id === args.templateId);
      push("Template", existing?.title ?? String(args.templateId));
    }
    push("Title", args.title);
    push("Body", args.body);
  } else if (name === "create_event" || name === "update_event" || name === "delete_event") {
    if (name !== "create_event") {
      const existing = events.find((e) => e.id === args.eventId);
      push("Event", existing?.title ?? String(args.eventId));
    } else {
      push("Title", args.title);
    }
    push("Date", args.date);
    push("Time", args.time);
    const leadName = args.leadId ? leads.find((l) => l.id === args.leadId)?.name : undefined;
    const listingName = args.listingId ? listings.find((l) => l.id === args.listingId)?.address : undefined;
    push("Lead", leadName ?? args.leadId);
    push("Listing", listingName ?? args.listingId);
    push("Notes", args.notes);
  } else if (name === "attach_file_to_lead" || name === "rename_file" || name === "delete_file" || name === "convert_file_to_pdf") {
    const existing = files.find((f) => f.id === args.fileId);
    push("File", existing?.name ?? String(args.fileId));
    if (name === "attach_file_to_lead") {
      const leadName = args.leadId ? leads.find((l) => l.id === args.leadId)?.name : "None";
      push("Attach to", leadName);
    }
    if (name === "rename_file") push("New name", args.name);
  }
  return fields;
}

function getTargetId(action: PendingAction): string | null {
  const a = action.args;
  switch (action.name) {
    case "update_lead":
    case "delete_lead":
    case "log_interaction":
      return a.leadId ? String(a.leadId) : null;
    case "update_listing":
    case "delete_listing":
      return a.listingId ? String(a.listingId) : null;
    case "complete_task":
    case "delete_task":
      return a.taskId ? String(a.taskId) : null;
    case "update_template":
    case "delete_template":
      return a.templateId ? String(a.templateId) : null;
    case "update_event":
    case "delete_event":
      return a.eventId ? String(a.eventId) : null;
    case "attach_file_to_lead":
    case "rename_file":
    case "delete_file":
    case "convert_file_to_pdf":
      return a.fileId ? String(a.fileId) : null;
    default:
      return null;
  }
}

async function callAssistant(
  contents: GeminiContent[],
  context: Record<string, unknown>,
): Promise<{ parts?: GeminiPart[]; error?: string }> {
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, context }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error ?? "The assistant is unavailable right now." };
    return { parts: data.parts };
  } catch {
    return { error: "Couldn't reach the assistant — check your connection." };
  }
}

type ListingPatch = Partial<{ address: string; price: number | null; agreementType: "sale" | "rental"; description: string | null }>;
type EventPatch = { title: string; notes: string | null; startAt: string; endAt: string | null; leadId: string | null; listingId: string | null };

function toStartAt(date: unknown, time: unknown): string {
  const d = String(date ?? "");
  const t = String(time ?? "09:00");
  return new Date(`${d}T${t || "09:00"}`).toISOString();
}

export function AssistantPanel({
  agentName,
  leads,
  listings,
  tasks,
  templates,
  events,
  files,
  onCreateLead,
  onUpdateLead,
  onDeleteLead,
  onLogInteraction,
  onCreateListing,
  onUpdateListing,
  onDeleteListing,
  onCreateTask,
  onCompleteTask,
  onDeleteTask,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onAttachFileToLead,
  onRenameFile,
  onDeleteFile,
  onConvertFileToPdf,
  onActionTarget,
}: {
  agentName: string;
  leads: LeadWithStatus[];
  listings: Listing[];
  tasks: Task[];
  templates: Template[];
  events: CalendarEvent[];
  files: FileRecord[];
  onCreateLead: (form: LeadFormValues) => Promise<Lead | null>;
  onUpdateLead: (id: string, patch: Record<string, unknown>) => Promise<Lead | null>;
  onDeleteLead: (id: string) => Promise<boolean>;
  onLogInteraction: (leadId: string, text: string) => Promise<boolean>;
  onCreateListing: (form: { address: string; price: number | null; agreementType: "sale" | "rental"; description: string | null }) => Promise<Listing | null>;
  onUpdateListing: (id: string, patch: ListingPatch) => Promise<Listing | null>;
  onDeleteListing: (id: string) => Promise<boolean>;
  onCreateTask: (text: string) => Promise<Task | null>;
  onCompleteTask: (id: string) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onCreateTemplate: (form: { title: string; body: string }) => Promise<Template | null>;
  onUpdateTemplate: (id: string, form: { title?: string; body?: string }) => Promise<Template | null>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
  onCreateEvent: (form: EventPatch) => Promise<CalendarEvent | null>;
  onUpdateEvent: (id: string, form: Partial<EventPatch>) => Promise<CalendarEvent | null>;
  onDeleteEvent: (id: string) => Promise<boolean>;
  onAttachFileToLead: (id: string, leadId: string | null) => Promise<FileRecord | null>;
  onRenameFile: (id: string, name: string) => Promise<FileRecord | null>;
  onDeleteFile: (id: string) => Promise<boolean>;
  onConvertFileToPdf: (id: string) => Promise<boolean>;
  onActionTarget?: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const historyRef = useRef<GeminiContent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const context = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      agentName,
      leads: leads.slice(0, 300).map((l) => ({ id: l.id, name: l.name, phone: l.phone, email: l.email, stage: l.stage, source: l.source })),
      listings: listings.slice(0, 150).map((l) => ({ id: l.id, address: l.address, agreementType: l.agreement_type, price: l.price })),
      tasks: tasks.slice(0, 200).map((t) => ({ id: t.id, text: t.text, done: t.done })),
      templates: templates.slice(0, 100).map((t) => ({ id: t.id, title: t.title })),
      events: events.slice(0, 200).map((e) => ({ id: e.id, title: e.title, startAt: e.start_at, leadId: e.lead_id, listingId: e.listing_id })),
      files: files.slice(0, 200).map((f) => ({ id: f.id, name: f.name, leadId: f.lead_id, convertibleToPdf: canConvertToPdf(f.mime_type, f.name) })),
      // Computed from local Date getters, not toISOString -- avoids a UTC
      // shift showing the wrong calendar day near midnight.
      todayLabel: now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      todayIso: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    };
  };

  const processParts = (parts: GeminiPart[]) => {
    const calls = parts.filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } => "functionCall" in p);
    const texts = parts.filter((p): p is { text: string } => "text" in p);

    for (const t of texts) {
      if (t.text.trim()) setMessages((prev) => [...prev, { kind: "text", role: "assistant", text: t.text.trim() }]);
    }
    if (calls.length > 0) {
      const actions: PendingAction[] = calls.map((c) => ({
        name: c.functionCall.name,
        args: c.functionCall.args,
        status: "pending",
        fields: describeFields(c.functionCall.name, c.functionCall.args, leads, listings, tasks, templates, events, files),
      }));
      setMessages((prev) => [...prev, { kind: "actions", actions }]);
    }
  };

  const sendTurn = async (nextContents: GeminiContent[]) => {
    setSending(true);
    const { parts, error } = await callAssistant(nextContents, context());
    setSending(false);
    if (error || !parts) {
      setMessages((prev) => [...prev, { kind: "error", text: error ?? "Something went wrong." }]);
      return;
    }
    historyRef.current = [...nextContents, { role: "model", parts }];
    processParts(parts);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((prev) => [...prev, { kind: "text", role: "user", text }]);
    const nextContents = [...historyRef.current, { role: "user" as const, parts: [{ text }] }];
    await sendTurn(nextContents);
  };

  const executeAction = async (action: PendingAction): Promise<Record<string, unknown>> => {
    try {
      const a = action.args;
      switch (action.name) {
        case "create_lead": {
          const lead = await onCreateLead({
            name: String(a.name ?? ""),
            phone: String(a.phone ?? ""),
            email: String(a.email ?? ""),
            source: (a.source as LeadFormValues["source"]) ?? "Other",
            timeline: (a.timeline as LeadFormValues["timeline"]) ?? "browsing",
            hasAgent: (a.hasAgent as LeadFormValues["hasAgent"]) ?? "unsure",
            notes: String(a.notes ?? ""),
          });
          return lead ? { status: "applied", leadId: lead.id } : { status: "failed" };
        }
        case "update_lead": {
          const patch: Record<string, unknown> = {};
          if (a.name !== undefined) patch.name = a.name;
          if (a.phone !== undefined) patch.phone = a.phone;
          if (a.email !== undefined) patch.email = a.email;
          if (a.source !== undefined) patch.source = a.source;
          if (a.timeline !== undefined) patch.timeline = a.timeline;
          if (a.hasAgent !== undefined) patch.has_agent = a.hasAgent;
          if (a.notes !== undefined) patch.notes = a.notes;
          if (a.stage !== undefined) patch.stage = a.stage;
          const updated = await onUpdateLead(String(a.leadId), patch);
          return updated ? { status: "applied" } : { status: "failed" };
        }
        case "delete_lead": {
          const ok = await onDeleteLead(String(a.leadId));
          return { status: ok ? "applied" : "failed" };
        }
        case "log_interaction": {
          const ok = await onLogInteraction(String(a.leadId), String(a.text ?? ""));
          return { status: ok ? "applied" : "failed" };
        }
        case "create_listing": {
          const listing = await onCreateListing({
            address: String(a.address ?? ""),
            price: a.price != null ? Number(a.price) : null,
            agreementType: (a.agreementType as "sale" | "rental") ?? "sale",
            description: a.description ? String(a.description) : null,
          });
          return listing ? { status: "applied", listingId: listing.id } : { status: "failed" };
        }
        case "update_listing": {
          const patch: ListingPatch = {};
          if (a.address !== undefined) patch.address = String(a.address);
          if (a.price !== undefined) patch.price = a.price != null ? Number(a.price) : null;
          if (a.agreementType !== undefined) patch.agreementType = a.agreementType as "sale" | "rental";
          if (a.description !== undefined) patch.description = String(a.description);
          const updated = await onUpdateListing(String(a.listingId), patch);
          return updated ? { status: "applied" } : { status: "failed" };
        }
        case "delete_listing": {
          const ok = await onDeleteListing(String(a.listingId));
          return { status: ok ? "applied" : "failed" };
        }
        case "create_task": {
          const task = await onCreateTask(String(a.text ?? ""));
          return task ? { status: "applied", taskId: task.id } : { status: "failed" };
        }
        case "complete_task": {
          const ok = await onCompleteTask(String(a.taskId));
          return { status: ok ? "applied" : "failed" };
        }
        case "delete_task": {
          const ok = await onDeleteTask(String(a.taskId));
          return { status: ok ? "applied" : "failed" };
        }
        case "create_template": {
          const t = await onCreateTemplate({ title: String(a.title ?? ""), body: String(a.body ?? "") });
          return t ? { status: "applied", templateId: t.id } : { status: "failed" };
        }
        case "update_template": {
          const form: { title?: string; body?: string } = {};
          if (a.title !== undefined) form.title = String(a.title);
          if (a.body !== undefined) form.body = String(a.body);
          const t = await onUpdateTemplate(String(a.templateId), form);
          return t ? { status: "applied" } : { status: "failed" };
        }
        case "delete_template": {
          const ok = await onDeleteTemplate(String(a.templateId));
          return { status: ok ? "applied" : "failed" };
        }
        case "create_event": {
          const ev = await onCreateEvent({
            title: String(a.title ?? ""),
            notes: a.notes ? String(a.notes) : null,
            startAt: toStartAt(a.date, a.time),
            endAt: null,
            leadId: a.leadId ? String(a.leadId) : null,
            listingId: a.listingId ? String(a.listingId) : null,
          });
          return ev ? { status: "applied", eventId: ev.id } : { status: "failed" };
        }
        case "update_event": {
          const patch: Partial<EventPatch> = {};
          if (a.title !== undefined) patch.title = String(a.title);
          if (a.notes !== undefined) patch.notes = String(a.notes);
          if (a.date !== undefined || a.time !== undefined) patch.startAt = toStartAt(a.date, a.time);
          if (a.leadId !== undefined) patch.leadId = a.leadId ? String(a.leadId) : null;
          if (a.listingId !== undefined) patch.listingId = a.listingId ? String(a.listingId) : null;
          const ev = await onUpdateEvent(String(a.eventId), patch);
          return ev ? { status: "applied" } : { status: "failed" };
        }
        case "delete_event": {
          const ok = await onDeleteEvent(String(a.eventId));
          return { status: ok ? "applied" : "failed" };
        }
        case "attach_file_to_lead": {
          const f = await onAttachFileToLead(String(a.fileId), a.leadId ? String(a.leadId) : null);
          return f ? { status: "applied" } : { status: "failed" };
        }
        case "rename_file": {
          const f = await onRenameFile(String(a.fileId), String(a.name ?? ""));
          return f ? { status: "applied" } : { status: "failed" };
        }
        case "delete_file": {
          const ok = await onDeleteFile(String(a.fileId));
          return { status: ok ? "applied" : "failed" };
        }
        case "convert_file_to_pdf": {
          const ok = await onConvertFileToPdf(String(a.fileId));
          return { status: ok ? "applied" : "failed" };
        }
        default:
          return { status: "failed", reason: "unknown_action" };
      }
    } catch {
      return { status: "failed" };
    }
  };

  const resolveAction = async (msgIndex: number, actionIndex: number, approve: boolean) => {
    const msg = messages[msgIndex];
    if (msg.kind !== "actions") return;
    const action = msg.actions[actionIndex];
    if (action.status !== "pending") return;

    const targetBefore = approve ? getTargetId(action) : null;
    if (targetBefore) onActionTarget?.(targetBefore);

    const result = approve ? await executeAction(action) : { status: "rejected_by_user" };

    if (approve) {
      const createdId = (result.leadId ?? result.listingId ?? result.taskId ?? result.templateId ?? result.eventId) as string | undefined;
      const highlightId = targetBefore ?? (createdId ? String(createdId) : null);
      if (highlightId) {
        onActionTarget?.(highlightId);
        setTimeout(() => onActionTarget?.(null), 1400);
      } else {
        onActionTarget?.(null);
      }
    }

    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex || m.kind !== "actions") return m;
        const actions = m.actions.map((a, j) => (j === actionIndex ? { ...a, status: (approve ? "approved" : "rejected") as PendingStatus } : a));
        return { ...m, actions };
      }),
    );

    const updatedMsg = messages[msgIndex];
    const stillActions = updatedMsg.kind === "actions" ? updatedMsg.actions : [];
    const allResolved = stillActions.every((a, j) => (j === actionIndex ? true : a.status !== "pending"));

    if (allResolved) {
      const functionResponses: GeminiPart[] = stillActions.map((a, j) => ({
        functionResponse: {
          name: a.name,
          response: j === actionIndex ? result : { status: a.status === "approved" ? "applied" : "rejected_by_user" },
        },
      }));
      const nextContents = [...historyRef.current, { role: "user" as const, parts: functionResponses }];
      await sendTurn(nextContents);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Foyer AI" : "Open Foyer AI"}
        className={`press fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full flex items-center justify-center ${sending ? "ai-glow" : ""}`}
        style={{
          background: `linear-gradient(135deg, ${COLORS.ai}, ${COLORS.aiBright})`,
          boxShadow: `0 8px 24px ${alpha(COLORS.ai, 45)}`,
        }}
      >
        {open ? <X size={20} color="#fff" /> : <Sparkles size={20} color="#fff" />}
      </button>

      {open && (
        <div
          className={`anim-popin fixed bottom-40 right-5 z-40 flex flex-col ${sending ? "ai-glow" : ""}`}
          style={{
            width: 360,
            maxWidth: "88vw",
            height: 520,
            maxHeight: "70vh",
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            boxShadow: "0 20px 48px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
            style={{ borderBottom: `1px solid ${COLORS.border}`, background: alpha(COLORS.ai, 10) }}
          >
            <Sparkles size={15} style={{ color: COLORS.aiBright }} />
            <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>
              Foyer AI
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {messages.length === 0 && (
              <p className="text-xs px-1" style={{ color: COLORS.inkSoft }}>
                Ask me to add a lead, log a call, schedule an event, manage tasks, templates, or files — anything in your CRM. I&apos;ll always check with
                you before saving.
              </p>
            )}
            {messages.map((m, i) => {
              if (m.kind === "text") {
                return (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="px-3 py-2 text-sm max-w-[85%]"
                      style={{
                        background: m.role === "user" ? COLORS.surface2 : alpha(COLORS.ai, 14),
                        color: COLORS.ink,
                        borderRadius: 10,
                        border: `1px solid ${m.role === "user" ? COLORS.border : alpha(COLORS.ai, 30)}`,
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              }
              if (m.kind === "error") {
                return (
                  <div key={i} className="px-3 py-2 text-xs" style={{ background: alpha(COLORS.accent, 10), color: COLORS.accent, borderRadius: 8 }}>
                    {m.text}
                  </div>
                );
              }
              return (
                <div key={i} className="space-y-2">
                  {m.actions.map((action, j) => {
                    const fields = action.fields;
                    const destructive = DESTRUCTIVE_ACTIONS.has(action.name);
                    const cardColor = destructive ? COLORS.accent : COLORS.ai;
                    const cardColorBright = destructive ? COLORS.accentBright : COLORS.aiBright;
                    return (
                      <div
                        key={j}
                        className="p-3"
                        style={{ background: COLORS.surface2, border: `1px solid ${alpha(cardColor, 40)}`, borderRadius: 10 }}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {destructive ? <TriangleAlert size={12} style={{ color: cardColorBright }} /> : <Sparkles size={12} style={{ color: cardColorBright }} />}
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: cardColorBright }}>
                            {actionTitle(action.name)}
                          </p>
                        </div>
                        <div className="space-y-0.5 mb-2">
                          {fields.map((f, k) => (
                            <p key={k} className="text-xs" style={{ color: COLORS.ink }}>
                              <span style={{ color: COLORS.inkSoft }}>{f.label}: </span>
                              {f.value}
                            </p>
                          ))}
                        </div>
                        {destructive && action.status === "pending" && (
                          <p className="text-xs mb-2" style={{ color: COLORS.accent }}>
                            {PERMANENT_ACTIONS.has(action.name) ? "This can't be undone." : "Removed from your active pipeline."}
                          </p>
                        )}
                        {action.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => resolveAction(i, j, true)}
                              className="press flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium"
                              style={{ background: cardColor, color: "#fff", borderRadius: 6 }}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => resolveAction(i, j, false)}
                              className="press px-2.5 py-1.5 text-xs font-medium"
                              style={{ color: COLORS.inkSoft }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs font-medium" style={{ color: action.status === "approved" ? cardColor : COLORS.inkSoft }}>
                            {action.status === "approved" ? "✓ Saved" : "Not saved"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="px-3 py-2" style={{ background: alpha(COLORS.ai, 14), borderRadius: 10 }}>
                  <Loader2 size={14} className="animate-spin" style={{ color: COLORS.aiBright }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-2.5 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Ask the assistant..."
              className="flex-1 px-3 py-2 text-sm outline-none"
              style={{ ...inputStyle, borderRadius: 8 }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="press w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: COLORS.ai, opacity: sending || !input.trim() ? 0.5 : 1 }}
            >
              <ArrowUp size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
