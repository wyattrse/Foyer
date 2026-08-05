import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  UserPlus, LayoutGrid, X, RotateCcw, Pencil, Check, Phone, Mail, Clock,
  ShieldCheck, Trash2, BarChart3, Tags, GripVertical,
  QrCode, ListTodo, Settings as SettingsIcon, Plus, MessageSquareText, DollarSign,
  BellRing, Search, AlertCircle, Download, MessageCircle,
} from "lucide-react";

// ---------- design tokens: Modernist / Swiss dark ----------
const COLORS = {
  bg: "#141311",
  surface: "#1D1B17",
  surface2: "#242119",
  border: "#38342A",
  borderStrong: "#4C4737",
  ink: "#F2EEE4",
  inkSoft: "#9A927E",
  accent: "#C63A2E",
  accentBright: "#E2543E",
  warm: "#D9A44E",
  cold: "#7C8894",
};

// Client-facing kiosk is deliberately inverted from the dark agent app --
// light and warm, since a stranger walking up shouldn't meet a black screen.
const KIOSK = { bg: "#F2EEE4", surface: "#FFFFFF", border: "#E4DDC9", ink: "#1C1B17", soft: "#7A7460", input: "#FBF9F3" };

const CARD = { background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxShadow: "0 10px 28px rgba(0,0,0,0.35)" };
const CARD_SM = { background: COLORS.surface, borderRadius: 6, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 18px rgba(0,0,0,0.3)" };
const inputStyle = { background: COLORS.surface2, border: `1px solid ${COLORS.border}`, color: COLORS.ink, borderRadius: 5 };

const STAGES = ["New", "Contacted", "Nurturing", "Showing", "Under Contract", "Closed", "Lost"];
const SOURCES = ["Open House", "Referral", "Inquiry", "Business Card", "Other"];

const TIMELINE_OPTIONS = [
  { value: "immediate", label: "0-1 month" },
  { value: "1-3", label: "1-3 months" },
  { value: "3-6", label: "3-6 months" },
  { value: "6plus", label: "6+ months" },
  { value: "browsing", label: "Just browsing" },
];
const AGENT_OPTIONS = [
  { value: "no", label: "No agent yet" },
  { value: "unsure", label: "Not sure" },
  { value: "yes", label: "Already has one" },
];

const CADENCE_DAYS = { hot: 1, warm: 7, cold: 30 };
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_TEMPLATES = [
  { id: "t1", title: "First touch (hot lead)", body: "Hi {name}, great meeting you! Wanted to follow up while it's fresh — happy to answer any questions about what we saw." },
  { id: "t2", title: "Weekly check-in", body: "Hi {name}, just checking in — any new must-haves or deal-breakers since we last talked? Happy to pull fresh listings." },
  { id: "t3", title: "Re-engage a cold lead", body: "Hi {name}, it's been a bit — still keeping an eye out for you. Let me know if your timeline or plans have changed." },
];

const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Space+Grotesk:wght@400;500;600&family=Space+Mono:wght@500;700&display=swap');
  * { box-sizing: border-box; }
  ::selection { background: ${COLORS.accent}55; }
  input:focus, select:focus, textarea:focus { outline: none; border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 2px ${COLORS.accent}33; }
  button:focus-visible { outline: 2px solid ${COLORS.accent}; outline-offset: 2px; }
  @keyframes fadeUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform:translateY(0);} }
  @keyframes slideInRight { from { opacity:0; transform: translateX(28px);} to {opacity:1; transform:translateX(0);} }
  @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }
  @keyframes popIn { from {opacity:0; transform: scale(0.92) translateY(6px);} to {opacity:1; transform:scale(1) translateY(0);} }
  @keyframes pulse { 0%,100% {opacity:.35} 50% {opacity:.75} }
  .anim-fadeup { opacity:0; animation: fadeUp 420ms cubic-bezier(.16,1,.3,1) forwards; }
  .anim-slidein { animation: slideInRight 380ms cubic-bezier(.16,1,.3,1); }
  .anim-fadein { animation: fadeIn 260ms ease-out; }
  .anim-popin { animation: popIn 480ms cubic-bezier(.34,1.56,.64,1); }
  .skeleton-pulse { animation: pulse 1.4s ease-in-out infinite; }
  .press { transition: transform 150ms cubic-bezier(.34,1.56,.64,1), opacity 200ms ease; }
  .press:active { transform: scale(0.96); }
  .mark { position: relative; overflow: hidden; transition: border-color 220ms ease, box-shadow 220ms ease; }
  .mark::before { content:''; position:absolute; left:0; top:0; bottom:0; width:0; background:${COLORS.accent}; transition: width 220ms cubic-bezier(.16,1,.3,1); }
  .mark:hover::before { width:3px; }
  .mark:hover { border-color: ${COLORS.borderStrong}; box-shadow: 0 12px 28px rgba(0,0,0,0.45); }
  .navtab { position:relative; transition: color 200ms ease; }
  .navtab::after { content:''; position:absolute; left:0; right:0; bottom:-1px; height:2px; background:${COLORS.accent}; transform: scaleX(0); transition: transform 260ms cubic-bezier(.16,1,.3,1); }
  .navtab.active::after { transform: scaleX(1); }
`;

// ---------- count-up ----------
function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ---------- scoring ----------
function computeAutoScore(lead) {
  const timelineW = { immediate: 40, "1-3": 30, "3-6": 15, "6plus": 5, browsing: 0 };
  const agentW = { no: 20, unsure: 10, yes: 0 };
  const sourceW = { "Open House": 15, Referral: 20, Inquiry: 15, "Business Card": 5, Other: 5 };
  let score = 10;
  score += timelineW[lead.timeline] ?? 10;
  score += agentW[lead.hasAgent] ?? 10;
  score += sourceW[lead.source] ?? 5;
  return Math.min(100, score);
}
function bucketOf(score) { if (score >= 65) return "hot"; if (score >= 35) return "warm"; return "cold"; }
function bucketColor(bucket) { return { hot: COLORS.accentBright, warm: COLORS.warm, cold: COLORS.cold }[bucket]; }
function effectiveScore(lead) { return lead.manualScore != null ? lead.manualScore : lead.autoScore; }
function nextTouchDue(lead) {
  const last = lead.interactions.length ? Math.max(...lead.interactions.map((i) => i.date)) : lead.createdAt;
  return last + CADENCE_DAYS[bucketOf(effectiveScore(lead))] * DAY_MS;
}
function isActiveLead(lead) { return lead.stage !== "Closed" && lead.stage !== "Lost"; }
function dueStatus(dueTs) {
  const diff = dueTs - Date.now();
  if (diff < 0) return "overdue";
  if (diff < DAY_MS) return "today";
  return "upcoming";
}
function reorderAndMove(allLeads, leadId, groupField, groupValue, beforeLeadId) {
  const dragged = allLeads.find((l) => l.id === leadId);
  if (!dragged) return allLeads;
  const others = allLeads.filter((l) => l.id !== leadId && l[groupField] === groupValue).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  let insertIndex = others.length;
  if (beforeLeadId) { const idx = others.findIndex((l) => l.id === beforeLeadId); if (idx !== -1) insertIndex = idx; }
  const updatedDragged = { ...dragged, [groupField]: groupValue };
  const newGroup = [...others.slice(0, insertIndex), updatedDragged, ...others.slice(insertIndex)].map((l, idx) => ({ ...l, order: idx }));
  const newGroupIds = new Map(newGroup.map((l) => [l.id, l]));
  return allLeads.map((l) => newGroupIds.get(l.id) ?? l);
}
function matchesSearch(lead, q) {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (lead.name || "").toLowerCase().includes(s) || (lead.phone || "").toLowerCase().includes(s) || (lead.email || "").toLowerCase().includes(s);
}
function findDuplicateLead(leads, form) {
  const phone = (form.phone || "").trim().toLowerCase();
  const email = (form.email || "").trim().toLowerCase();
  if (!phone && !email) return null;
  return leads.find((l) => (phone && (l.phone || "").trim().toLowerCase() === phone) || (email && (l.email || "").trim().toLowerCase() === email)) || null;
}
function exportLeadsCSV(leads) {
  const headers = ["Name", "Phone", "Email", "Source", "Stage", "Timeline", "Has Agent", "Score", "Deal Value", "Created", "Notes"];
  const rows = leads.map((l) => [
    l.name, l.phone, l.email, l.source, l.stage,
    TIMELINE_OPTIONS.find((t) => t.value === l.timeline)?.label || l.timeline,
    l.hasAgent, effectiveScore(l), l.dealValue ?? "", new Date(l.createdAt).toLocaleDateString(), (l.notes || "").replace(/\n/g, " "),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `foyer-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- brand mark ----------
function BrandMark({ size = "sm", ink = COLORS.ink, arc = COLORS.borderStrong }) {
  const big = size === "lg";
  const px = big ? 68 : 24;
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width={px} height={px} viewBox="0 0 40 40" fill="none">
        <path d="M8 6 L8 34" stroke={ink} strokeWidth={big ? 3 : 2.5} strokeLinecap="round" />
        <path d="M8 6 L30 20" stroke={COLORS.accent} strokeWidth={big ? 3 : 2.5} strokeLinecap="round" />
        <path d="M8 34 A28 28 0 0 0 30 20" stroke={arc} strokeWidth={big ? 2 : 1.5} fill="none" />
      </svg>
      <span style={{ fontFamily: "'Fraunces', serif", color: ink, fontSize: big ? 36 : 19, fontWeight: 600, letterSpacing: "-0.01em" }}>Foyer</span>
    </div>
  );
}

// ---------- QR placeholder ----------
function QRPlaceholder({ size = 176, dark = "#1C1B17", light = "#FFFFFF" }) {
  const modules = 21;
  const cell = size / modules;
  const isFinderZone = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= modules - 7) || (r >= modules - 7 && c < 7);
  const finderFilled = (r, c) => r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
  const cells = [];
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      let filled;
      if (isFinderZone(r, c)) {
        const corner = r < 7 && c < 7 ? [r, c] : r < 7 ? [r, c - (modules - 7)] : [r - (modules - 7), c];
        filled = finderFilled(corner[0], corner[1]);
      } else {
        filled = (r * 13 + c * 7 + r * c) % 7 < 3;
      }
      if (filled) cells.push([r, c]);
    }
  }
  return (
    <div className="inline-block p-3" style={{ background: light, borderRadius: 8, border: `1px solid #E4DDC9` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={light} />
        {cells.map(([r, c], i) => <rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill={dark} />)}
      </svg>
    </div>
  );
}

function ScoreRing({ score, size = 44 }) {
  const color = bucketColor(bucketOf(score));
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.border} strokeWidth="3.5" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="3.5" fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 500ms cubic-bezier(.16,1,.3,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace", fontSize: size * 0.26, fontWeight: 700, color: COLORS.ink }}>{score}</div>
    </div>
  );
}

function Pill({ children, color }) {
  return <span className="px-2 py-0.5 text-xs font-medium uppercase tracking-wide" style={{ background: color + "1F", color, border: `1px solid ${color}55`, borderRadius: 4 }}>{children}</span>;
}

function PrimaryButton({ children, onClick, style, className = "", type = "button" }) {
  return (
    <button type={type} onClick={onClick} className={`press py-2 text-sm font-medium transition-opacity hover:opacity-90 ${className}`} style={{ background: COLORS.accent, color: "#FBF3EF", borderRadius: 5, ...style }}>
      {children}
    </button>
  );
}

const label = (children) => <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>{children}</label>;

// ---------- toasts ----------
function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 items-end" style={{ maxWidth: "90vw" }}>
      {toasts.map((t) => (
        <div key={t.id} className="anim-fadeup mark flex items-center gap-3 px-4 py-3" style={{ ...CARD_SM, animationDelay: "0ms" }}>
          <span className="text-sm" style={{ color: COLORS.ink }}>{t.message}</span>
          {t.actionLabel && (
            <button onClick={() => { t.onAction && t.onAction(); onDismiss(t.id); }} className="text-xs font-medium uppercase tracking-wide flex-shrink-0" style={{ color: COLORS.accentBright }}>{t.actionLabel}</button>
          )}
          <button onClick={() => onDismiss(t.id)} style={{ color: COLORS.inkSoft }} className="flex-shrink-0"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// ---------- loading skeleton ----------
function SkeletonBlock({ w, h = 10 }) {
  return <div className="skeleton-pulse" style={{ width: w, height: h, background: COLORS.surface2, borderRadius: 3 }} />;
}
function SkeletonCard() {
  return (
    <div className="p-3.5 mb-2.5" style={CARD_SM}>
      <div className="flex items-center gap-3">
        <div className="skeleton-pulse" style={{ width: 38, height: 38, borderRadius: "50%", background: COLORS.surface2, flexShrink: 0 }} />
        <div className="flex-1 space-y-2"><SkeletonBlock w="55%" /><SkeletonBlock w="30%" h={8} /></div>
      </div>
    </div>
  );
}
function LoadingSkeleton() {
  return <div className="max-w-md">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>;
}

// ---------- lead form ----------
// `light` renders the client-facing (kiosk) theme. `checkDuplicate`/`onViewExisting`
// are only passed for the agent-facing Quick Add flow -- kiosk sign-ins skip the
// duplicate check entirely so a client is never shown backend data-quality prompts.
function LeadForm({ mode, onSubmit, onCancel, light = false, checkDuplicate, onViewExisting }) {
  const isCapture = mode === "capture";
  const [form, setForm] = useState({ name: "", phone: "", email: "", source: isCapture ? "Open House" : "Referral", timeline: "1-3", hasAgent: "unsure", notes: "" });
  const [touched, setTouched] = useState(false);
  const [dup, setDup] = useState(null);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); if (k === "phone" || k === "email") setDup(null); };
  const submit = (force = false) => {
    setTouched(true);
    if (!form.name.trim()) return;
    if (!force && checkDuplicate) {
      const match = checkDuplicate(form);
      if (match) { setDup(match); return; }
    }
    onSubmit(form);
  };

  const t = light
    ? { input: { background: KIOSK.input, border: `1px solid ${KIOSK.border}`, color: KIOSK.ink, borderRadius: 5 }, labelColor: KIOSK.soft, errColor: COLORS.accent, cancelColor: KIOSK.soft, border: KIOSK.border }
    : { input: inputStyle, labelColor: COLORS.inkSoft, errColor: COLORS.accentBright, cancelColor: COLORS.inkSoft, border: COLORS.border };
  const lbl = (children) => <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: t.labelColor, fontSize: 10.5 }}>{children}</label>;

  return (
    <div className="space-y-4">
      <div>
        {lbl(<>Name {touched && !form.name.trim() && <span style={{ color: t.errColor }}>— required</span>}</>)}
        <input autoFocus value={form.name} onChange={set("name")} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Visitor's name" className="w-full px-3 py-2.5 text-sm outline-none" style={{ ...t.input, borderColor: touched && !form.name.trim() ? t.errColor : t.border }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>{lbl("Phone")}<input value={form.phone} onChange={set("phone")} placeholder="(555) 000-0000" className="w-full px-3 py-2.5 text-sm outline-none" style={t.input} /></div>
        <div>{lbl("Email")}<input value={form.email} onChange={set("email")} placeholder="name@email.com" className="w-full px-3 py-2.5 text-sm outline-none" style={t.input} /></div>
      </div>
      {!isCapture && (
        <div>
          {lbl("Lead type")}
          <select value={form.source} onChange={set("source")} className="w-full px-3 py-2.5 text-sm outline-none" style={t.input}>
            {SOURCES.filter((s) => s !== "Open House").map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>{lbl("Buying timeline")}<select value={form.timeline} onChange={set("timeline")} className="w-full px-3 py-2.5 text-sm outline-none" style={t.input}>{TIMELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div>{lbl("Has an agent?")}<select value={form.hasAgent} onChange={set("hasAgent")} className="w-full px-3 py-2.5 text-sm outline-none" style={t.input}>{AGENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
      </div>
      <div>
        {lbl("Notes")}
        <textarea value={form.notes} onChange={set("notes")} rows={2} placeholder={isCapture ? "Loved the kitchen, worried about commute..." : "How you met, context..."} className="w-full px-3 py-2.5 text-sm outline-none resize-none" style={t.input} />
      </div>

      {dup && (
        <div className="p-3 text-xs" style={{ ...CARD_SM, borderColor: COLORS.accent + "80" }}>
          <p style={{ color: COLORS.ink }}>This might already be <strong>{dup.name}</strong> ({dup.phone || dup.email}), added {new Date(dup.createdAt).toLocaleDateString()}.</p>
          <div className="flex gap-4 mt-2">
            <button type="button" onClick={() => onViewExisting && onViewExisting(dup)} className="font-medium uppercase tracking-wide" style={{ color: COLORS.accentBright }}>View existing</button>
            <button type="button" onClick={() => submit(true)} className="uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Add as new anyway</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <PrimaryButton onClick={() => submit()} className="flex-1" style={light ? { background: COLORS.accent } : {}}>{isCapture ? "Sign in" : "Add lead"}</PrimaryButton>
        {onCancel && <button type="button" onClick={onCancel} className="press px-4 py-2 text-sm font-medium" style={{ color: t.cancelColor }}>Cancel</button>}
      </div>
    </div>
  );
}

// ---------- lead detail ----------
function LeadDetail({ lead, onClose, onUpdate, onDelete, templates }) {
  const [note, setNote] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [editingScore, setEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState(effectiveScore(lead));
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const score = effectiveScore(lead);
  const bucket = bucketOf(score);
  const due = nextTouchDue(lead);
  const status = dueStatus(due);
  const setF = (k) => (e) => setEditData((d) => ({ ...d, [k]: e.target.value }));
  const startEdit = () => { setEditData({ name: lead.name, phone: lead.phone, email: lead.email, source: lead.source, timeline: lead.timeline, hasAgent: lead.hasAgent, notes: lead.notes, dealValue: lead.dealValue ?? "" }); setEditing(true); };
  const saveEdit = () => { if (!editData.name.trim()) return; onUpdate({ ...lead, ...editData, dealValue: editData.dealValue === "" ? null : Number(editData.dealValue) }); setEditing(false); };
  const applyTemplate = (id) => { setTemplateId(id); const t = templates.find((t) => t.id === id); if (t) setNote(t.body.replace(/\{name\}/g, lead.name)); };
  const logInteraction = () => { if (!note.trim()) return; onUpdate({ ...lead, interactions: [...lead.interactions, { text: note.trim(), date: Date.now() }] }); setNote(""); setTemplateId(""); };

  return (
    <div className="fixed inset-0 z-30 flex justify-end anim-fadein" style={{ background: "#0A0A08AA", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="anim-slidein w-full max-w-md h-full overflow-y-auto p-6" style={{ background: COLORS.bg, borderLeft: `1px solid ${COLORS.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            {editing ? <input value={editData.name} onChange={setF("name")} className="text-xl w-full px-2 py-1 outline-none" style={{ ...inputStyle, fontFamily: "'Fraunces', serif" }} /> : <h2 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-xl truncate">{lead.name}</h2>}
            <p className="text-xs mt-0.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>{lead.source} · {new Date(lead.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {!editing && <button onClick={startEdit} title="Edit lead" className="press w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70" style={{ color: COLORS.inkSoft }}><Pencil size={16} /></button>}
            <button onClick={onClose} className="press w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70" style={{ color: COLORS.inkSoft }}><X size={18} /></button>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 mb-3" style={CARD}>
          <ScoreRing score={score} size={56} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Pill color={bucketColor(bucket)}>{bucket}</Pill>
              {lead.manualScore != null && <span className="text-xs" style={{ color: COLORS.inkSoft }}>overridden (auto: {lead.autoScore})</span>}
            </div>
            {editingScore ? (
              <div className="flex items-center gap-2 mt-2">
                <input type="number" min={0} max={100} value={scoreInput} onChange={(e) => setScoreInput(e.target.value)} className="w-16 px-2 py-1 text-sm outline-none" style={inputStyle} />
                <button onClick={() => { onUpdate({ ...lead, manualScore: Math.max(0, Math.min(100, Number(scoreInput))) }, { silent: true }); setEditingScore(false); }} style={{ color: COLORS.accentBright }}><Check size={16} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => setEditingScore(true)} className="text-xs flex items-center gap-1" style={{ color: COLORS.accentBright }}><Pencil size={12} /> Override score</button>
                {lead.manualScore != null && <button onClick={() => onUpdate({ ...lead, manualScore: null }, { silent: true })} className="text-xs flex items-center gap-1" style={{ color: COLORS.inkSoft }}><RotateCcw size={12} /> Reset to auto</button>}
              </div>
            )}
          </div>
        </div>

        {isActiveLead(lead) && (
          <div className="flex items-center gap-2 mb-5 px-4 py-2.5 text-xs" style={{ ...CARD_SM, color: status === "overdue" ? COLORS.accentBright : status === "today" ? COLORS.warm : COLORS.inkSoft }}>
            <BellRing size={13} />
            {status === "overdue" ? `Follow-up overdue — was due ${new Date(due).toLocaleDateString()}` : status === "today" ? "Follow-up due today" : `Next follow-up due ${new Date(due).toLocaleDateString()}`}
          </div>
        )}

        {editing ? (
          <div className="space-y-3 mb-5 p-4" style={CARD}>
            <div className="grid grid-cols-2 gap-3">
              <div>{label("Phone")}<input value={editData.phone} onChange={setF("phone")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle} /></div>
              <div>{label("Email")}<input value={editData.email} onChange={setF("email")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle} /></div>
            </div>
            <div>{label("Lead type (bin)")}<select value={editData.source} onChange={setF("source")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle}>{SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3">
              <div>{label("Timeline")}<select value={editData.timeline} onChange={setF("timeline")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle}>{TIMELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div>{label("Has an agent?")}<select value={editData.hasAgent} onChange={setF("hasAgent")} className="w-full px-3 py-2 text-sm outline-none" style={inputStyle}>{AGENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            </div>
            <div>{label("Your gross commission on this deal ($)")}<input type="number" min="0" value={editData.dealValue} onChange={setF("dealValue")} placeholder="Only once under contract" className="w-full px-3 py-2 text-sm outline-none" style={inputStyle} /></div>
            <div>{label("Notes")}<textarea value={editData.notes} onChange={setF("notes")} rows={2} className="w-full px-3 py-2 text-sm outline-none resize-none" style={inputStyle} /></div>
            <div className="flex gap-2 pt-1">
              <PrimaryButton onClick={saveEdit} className="flex-1">Save changes</PrimaryButton>
              <button onClick={() => setEditing(false)} className="press px-4 py-2 text-sm font-medium" style={{ color: COLORS.inkSoft }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-5 text-sm" style={{ color: COLORS.ink }}>
            {lead.phone && (
              <div className="flex items-center gap-2 flex-wrap">
                <Phone size={14} style={{ color: COLORS.inkSoft }} />
                <a href={`tel:${lead.phone}`} style={{ color: COLORS.ink, textDecoration: "underline", textDecorationColor: COLORS.border }}>{lead.phone}</a>
                <a href={`sms:${lead.phone}`} className="text-xs flex items-center gap-1" style={{ color: COLORS.accentBright }}><MessageCircle size={12} /> Text</a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} style={{ color: COLORS.inkSoft }} />
                <a href={`mailto:${lead.email}`} style={{ color: COLORS.ink, textDecoration: "underline", textDecorationColor: COLORS.border }}>{lead.email}</a>
              </div>
            )}
            <div className="flex items-center gap-2"><Clock size={14} style={{ color: COLORS.inkSoft }} /> {TIMELINE_OPTIONS.find((t) => t.value === lead.timeline)?.label}</div>
            {lead.dealValue != null && <div className="flex items-center gap-2"><DollarSign size={14} style={{ color: COLORS.inkSoft }} /> ${Number(lead.dealValue).toLocaleString()} gross commission</div>}
          </div>
        )}

        <div className="mb-5">
          {label("Stage")}
          <select value={lead.stage} onChange={(e) => onUpdate({ ...lead, stage: e.target.value }, { silent: true })} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </div>

        {!editing && lead.notes && (
          <div className="mb-5">
            <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>Notes</p>
            <p className="text-sm p-3.5" style={{ ...CARD_SM, color: COLORS.ink }}>{lead.notes}</p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>Interaction log</p>
          <div className="space-y-2 mb-3">
            {[...lead.interactions].reverse().map((i, idx) => (
              <div key={idx} className="text-sm p-3" style={CARD_SM}>
                <p style={{ color: COLORS.ink }}>{i.text}</p>
                <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{new Date(i.date).toLocaleString()}</p>
              </div>
            ))}
            {lead.interactions.length === 0 && <p className="text-xs italic" style={{ color: COLORS.inkSoft }}>No touches logged yet.</p>}
          </div>
          {templates.length > 0 && (
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} className="w-full mb-2 px-3 py-2 text-xs outline-none" style={inputStyle}>
              <option value="">Insert a template...</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log a call, text, or showing..." className="flex-1 px-3 py-2.5 text-sm outline-none" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && logInteraction()} />
            <PrimaryButton onClick={logInteraction} className="px-4">Log</PrimaryButton>
          </div>
        </div>

        <div className="pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-xs flex items-center gap-1.5" style={{ color: COLORS.accentBright }}><Trash2 size={13} /> Delete lead</button>
          ) : (
            <div className="flex items-center gap-3 text-xs">
              <span style={{ color: COLORS.ink }}>Delete this lead permanently?</span>
              <button onClick={() => onDelete(lead)} className="font-medium" style={{ color: COLORS.accentBright }}>Confirm</button>
              <button onClick={() => setConfirmDelete(false)} style={{ color: COLORS.inkSoft }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- lead card ----------
function LeadCard({ lead, onClick, dragProps, delay = 0 }) {
  const score = effectiveScore(lead);
  const status = isActiveLead(lead) ? dueStatus(nextTouchDue(lead)) : null;
  return (
    <div {...dragProps} onClick={onClick} className="mark anim-fadeup w-full text-left p-3.5 mb-2.5 cursor-pointer" style={{ ...CARD_SM, borderColor: status === "overdue" ? COLORS.accentBright + "70" : COLORS.border, animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-3">
        <ScoreRing score={score} size={38} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{lead.name}</p>
          <p className="text-xs truncate uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>{lead.stage}</p>
        </div>
        {status === "overdue" && <AlertCircle size={13} style={{ color: COLORS.accentBright }} />}
        {lead.manualScore != null && <Pencil size={11} style={{ color: COLORS.inkSoft }} />}
        <GripVertical size={14} style={{ color: COLORS.border, cursor: "grab" }} />
      </div>
    </div>
  );
}

// ---------- board ----------
function Board({ leads, groupField, groups, onSelect, onDropCard }) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldCheck size={32} style={{ color: COLORS.inkSoft }} className="mb-3" />
        <p className="text-sm max-w-xs" style={{ color: COLORS.inkSoft }}>No leads match. Try clearing your search or filters.</p>
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map((g, gi) => {
        const groupLeads = leads.filter((l) => l[groupField] === g).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return (
          <div key={g} className="flex-shrink-0 w-64" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) onDropCard(id, g, null); }}>
            <div className="flex items-center justify-between mb-2.5 px-1 pb-2" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
                {groupField === "stage" && <span style={{ color: COLORS.accentBright, fontFamily: "'Space Mono', monospace" }}>{String(gi + 1).padStart(2, "0")} </span>}
                {g}
              </p>
              <span className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>{groupLeads.length}</span>
            </div>
            <div className="min-h-[40px]">
              {groupLeads.map((l, idx) => (
                <LeadCard key={l.id} lead={l} delay={idx * 35} onClick={() => onSelect(l)} dragProps={{
                  draggable: true,
                  onDragStart: (e) => e.dataTransfer.setData("text/plain", l.id),
                  onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); },
                  onDrop: (e) => { e.preventDefault(); e.stopPropagation(); const id = e.dataTransfer.getData("text/plain"); if (id && id !== l.id) onDropCard(id, g, l.id); },
                }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- follow-ups ----------
function FollowUps({ leads, onSelect }) {
  const active = leads.filter(isActiveLead).map((l) => ({ lead: l, due: nextTouchDue(l) })).sort((a, b) => a.due - b.due);
  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BellRing size={32} style={{ color: COLORS.inkSoft }} className="mb-3" />
        <p className="text-sm max-w-xs" style={{ color: COLORS.inkSoft }}>No active leads match right now.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 max-w-xl">
      {active.map(({ lead, due }, idx) => {
        const status = dueStatus(due);
        const color = status === "overdue" ? COLORS.accentBright : status === "today" ? COLORS.warm : COLORS.inkSoft;
        const lbl = status === "overdue" ? `Overdue · was due ${new Date(due).toLocaleDateString()}` : status === "today" ? "Due today" : `Due ${new Date(due).toLocaleDateString()}`;
        return (
          <button key={lead.id} onClick={() => onSelect(lead)} className="mark anim-fadeup w-full flex items-center gap-3 p-3.5 text-left" style={{ ...CARD_SM, borderColor: status === "overdue" ? COLORS.accentBright + "70" : COLORS.border, animationDelay: `${idx * 35}ms` }}>
            <ScoreRing score={effectiveScore(lead)} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{lead.name}</p>
              <p className="text-xs truncate uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>{lead.stage} · {lead.source}</p>
            </div>
            <span className="text-xs font-medium flex-shrink-0" style={{ color }}>{lbl}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- overview ----------
function StatCard({ label: lbl, value, color, delay = 0 }) {
  const animated = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div className="mark anim-fadeup p-4" style={{ ...CARD, animationDelay: `${delay}ms` }}>
      <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>{lbl}</p>
      <p className="text-2xl" style={{ color: color || COLORS.ink, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{typeof value === "number" ? animated : value}</p>
    </div>
  );
}

function Overview({ leads }) {
  const total = leads.length;
  const counts = { hot: 0, warm: 0, cold: 0 };
  leads.forEach((l) => counts[bucketOf(effectiveScore(l))]++);
  const overdueCount = leads.filter((l) => isActiveLead(l) && dueStatus(nextTouchDue(l)) === "overdue").length;
  const bySource = SOURCES.map((s) => ({ source: s, count: leads.filter((l) => l.source === s).length }));
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Snapshot</p>
        <button onClick={() => exportLeadsCSV(leads)} disabled={total === 0} className="press flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide disabled:opacity-40" style={{ color: COLORS.accentBright }}>
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total leads" value={total} delay={0} />
        <StatCard label="Hot" value={counts.hot} color={COLORS.accentBright} delay={40} />
        <StatCard label="Warm" value={counts.warm} color={COLORS.warm} delay={80} />
        <StatCard label="Cold" value={counts.cold} color={COLORS.cold} delay={120} />
        <StatCard label="Overdue follow-ups" value={overdueCount} color={overdueCount > 0 ? COLORS.accentBright : COLORS.ink} delay={160} />
      </div>
      <div className="anim-fadeup p-5" style={{ ...CARD, animationDelay: "200ms" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLORS.inkSoft }}>By lead type</p>
        <div className="space-y-2.5">
          {bySource.map(({ source, count }) => (
            <div key={source} className="flex items-center gap-3">
              <span className="text-sm w-32" style={{ color: COLORS.ink }}>{source}</span>
              <div className="flex-1 h-1.5" style={{ background: COLORS.surface2, borderRadius: 2 }}><div className="h-1.5 transition-all duration-700" style={{ width: total ? `${(count / total) * 100}%` : 0, background: COLORS.accent, borderRadius: 2 }} /></div>
              <span className="text-xs w-6 text-right" style={{ color: COLORS.inkSoft, fontFamily: "'Space Mono', monospace" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- tasks tab ----------
function TasksTab({ tasks, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState("");
  const submit = () => { if (!text.trim()) return; onAdd(text.trim()); setText(""); };
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  return (
    <div className="max-w-lg">
      <div className="flex gap-2 mb-5">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Follow up with the Garcias, order signs..." className="flex-1 px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        <PrimaryButton onClick={submit} className="px-4 flex items-center gap-1"><Plus size={14} /> Add</PrimaryButton>
      </div>
      <div className="space-y-2 mb-6">
        {open.length === 0 && <p className="text-xs italic" style={{ color: COLORS.inkSoft }}>Nothing pending — nice.</p>}
        {open.map((t, idx) => (
          <div key={t.id} className="mark anim-fadeup flex items-center gap-3 p-3" style={{ ...CARD_SM, animationDelay: `${idx * 30}ms` }}>
            <button onClick={() => onToggle(t.id)} className="press w-4 h-4 rounded-full flex-shrink-0" style={{ border: `2px solid ${COLORS.accent}` }} />
            <span className="flex-1 text-sm" style={{ color: COLORS.ink }}>{t.text}</span>
            <button onClick={() => onDelete(t.id)} style={{ color: COLORS.inkSoft }}><X size={14} /></button>
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.inkSoft }}>Done</p>
          <div className="space-y-2">
            {done.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 opacity-60" style={CARD_SM}>
                <button onClick={() => onToggle(t.id)} className="press w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: COLORS.accent }}><Check size={11} color="#fff" /></button>
                <span className="flex-1 text-sm line-through" style={{ color: COLORS.inkSoft }}>{t.text}</span>
                <button onClick={() => onDelete(t.id)} style={{ color: COLORS.inkSoft }}><X size={14} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- templates tab ----------
function TemplatesTab({ templates, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", body: "" });
  const submitNew = () => { if (!form.title.trim() || !form.body.trim()) return; onAdd(form); setForm({ title: "", body: "" }); setAdding(false); };
  const startEdit = (t) => { setEditingId(t.id); setEditForm({ title: t.title, body: t.body }); };
  const saveEdit = (id) => { onUpdate(id, editForm); setEditingId(null); };

  return (
    <div className="max-w-xl">
      <p className="text-xs mb-4" style={{ color: COLORS.inkSoft }}>Use <code>{"{name}"}</code> and it'll be swapped for the lead's name when you insert it into a follow-up.</p>
      <div className="space-y-2 mb-4">
        {templates.map((t, idx) => (
          <div key={t.id} className="mark anim-fadeup p-4" style={{ ...CARD_SM, animationDelay: `${idx * 40}ms` }}>
            {editingId === t.id ? (
              <div className="space-y-2">
                <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 text-sm outline-none font-medium" style={inputStyle} />
                <textarea value={editForm.body} onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm outline-none resize-none" style={inputStyle} />
                <div className="flex gap-2">
                  <PrimaryButton onClick={() => saveEdit(t.id)} className="px-3 py-1.5 text-xs">Save</PrimaryButton>
                  <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: COLORS.inkSoft }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium" style={{ color: COLORS.ink }}>{t.title}</p>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button onClick={() => startEdit(t)} style={{ color: COLORS.inkSoft }}><Pencil size={13} /></button>
                    <button onClick={() => onDelete(t.id)} style={{ color: COLORS.accentBright }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="text-xs" style={{ color: COLORS.inkSoft }}>{t.body}</p>
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
            <PrimaryButton onClick={submitNew} className="px-3 py-1.5 text-xs">Add template</PrimaryButton>
            <button onClick={() => setAdding(false)} className="text-xs" style={{ color: COLORS.inkSoft }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="press flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.accentBright }}><Plus size={14} /> New template</button>
      )}
    </div>
  );
}

// ---------- commission tab ----------
function CommissionTab({ leads, settings }) {
  const split = settings.commissionSplit || 70;
  const deals = leads.filter((l) => l.dealValue != null && (l.stage === "Under Contract" || l.stage === "Closed"));
  const pending = deals.filter((l) => l.stage === "Under Contract");
  const closed = deals.filter((l) => l.stage === "Closed");
  const sum = (arr) => Math.round(arr.reduce((a, l) => a + Number(l.dealValue) * (split / 100), 0));
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-6 max-w-md">
        <StatCard label={`Pending (${pending.length} deals)`} value={sum(pending)} color={COLORS.warm} />
        <StatCard label={`Earned (${closed.length} deals)`} value={sum(closed)} color={COLORS.accentBright} />
      </div>
      <p className="text-xs mb-3" style={{ color: COLORS.inkSoft }}>Assumes your {split}% split, set in Settings. Net = gross commission entered on a lead × your split.</p>
      {deals.length === 0 ? (
        <p className="text-sm italic" style={{ color: COLORS.inkSoft }}>No deals with a commission value yet — add one from a lead's edit screen once it's under contract.</p>
      ) : (
        <div className="space-y-2 max-w-xl">
          {deals.map((l) => (
            <div key={l.id} className="mark flex items-center justify-between p-3.5 text-sm" style={CARD_SM}>
              <div><p style={{ color: COLORS.ink }}>{l.name}</p><p className="text-xs uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>{l.stage}</p></div>
              <div className="text-right">
                <p style={{ color: COLORS.ink, fontFamily: "'Space Mono', monospace" }}>${Number(l.dealValue).toLocaleString()} gross</p>
                <p className="text-xs" style={{ color: COLORS.accentBright, fontFamily: "'Space Mono', monospace" }}>${(Number(l.dealValue) * (split / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })} net</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- settings tab ----------
function SettingsTab({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  return (
    <div className="max-w-md p-6" style={CARD}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.accentBright }}>Your profile</p>
      <div className="space-y-3">
        <div>{label("Your name")}<input value={form.agentName} onChange={(e) => setForm((f) => ({ ...f, agentName: e.target.value }))} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} /></div>
        <div>{label("Brokerage")}<input value={form.brokerage} onChange={(e) => setForm((f) => ({ ...f, brokerage: e.target.value }))} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} /></div>
        <div>{label("Your commission split (%)")}<input type="number" min="0" max="100" value={form.commissionSplit} onChange={(e) => setForm((f) => ({ ...f, commissionSplit: Number(e.target.value) }))} className="w-full px-3 py-2.5 text-sm outline-none" style={inputStyle} /></div>
      </div>
      <PrimaryButton onClick={() => onSave(form)} className="mt-4 px-4">Save</PrimaryButton>
      <p className="text-xs mt-4" style={{ color: COLORS.inkSoft }}>Multi-agent sign-in and team profiles are on the roadmap. For now this just personalizes your own dashboard.</p>
    </div>
  );
}

// ---------- app ----------
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState({ agentName: "", brokerage: "", commissionSplit: 70 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [subtab, setSubtab] = useState("pipeline");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [toasts, setToasts] = useState([]);
  const [kioskThanks, setKioskThanks] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [leadsRes, tasksRes, settingsRes, templatesRes] = await Promise.allSettled([
          window.storage.get("leads", false),
          window.storage.get("tasks", false),
          window.storage.get("settings", false),
          window.storage.get("templates", false),
        ]);
        setLeads(leadsRes.status === "fulfilled" && leadsRes.value ? JSON.parse(leadsRes.value.value) : []);
        setTasks(tasksRes.status === "fulfilled" && tasksRes.value ? JSON.parse(tasksRes.value.value) : []);
        setSettings(settingsRes.status === "fulfilled" && settingsRes.value ? JSON.parse(settingsRes.value.value) : { agentName: "", brokerage: "", commissionSplit: 70 });
        if (templatesRes.status === "fulfilled" && templatesRes.value) {
          setTemplates(JSON.parse(templatesRes.value.value));
        } else {
          setTemplates(DEFAULT_TEMPLATES);
          window.storage.set("templates", JSON.stringify(DEFAULT_TEMPLATES), false).catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pushToast = useCallback(({ message, actionLabel, onAction, duration = 4000 }) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { id, message, actionLabel, onAction }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Accepts either a plain array or an updater function, so undo (which needs
  // the freshest state at click-time, not deletion-time) stays safe.
  const persistLeads = useCallback(async (nextOrFn) => {
    setLeads((prev) => {
      const next = typeof nextOrFn === "function" ? nextOrFn(prev) : nextOrFn;
      window.storage.set("leads", JSON.stringify(next), false).catch(() => setError("Couldn't save — your changes may not persist."));
      return next;
    });
  }, []);
  const persistTasks = useCallback(async (next) => { setTasks(next); try { await window.storage.set("tasks", JSON.stringify(next), false); } catch { setError("Couldn't save — your changes may not persist."); } }, []);
  const persistSettings = useCallback(async (next) => { setSettings(next); try { await window.storage.set("settings", JSON.stringify(next), false); } catch { setError("Couldn't save — your changes may not persist."); } }, []);
  const persistTemplates = useCallback(async (next) => { setTemplates(next); try { await window.storage.set("templates", JSON.stringify(next), false); } catch { setError("Couldn't save — your changes may not persist."); } }, []);

  // Pure creation -- no navigation side effects here. Kiosk and Quick Add
  // each decide what happens next (see their onSubmit wrappers below), so
  // a client signing in at the kiosk is never bounced to the agent dashboard.
  const addLead = (form) => {
    const autoScore = computeAutoScore(form);
    const newLead = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), ...form, autoScore, manualScore: null, dealValue: null, stage: "New", order: Date.now(), interactions: [], createdAt: Date.now() };
    persistLeads((prev) => [newLead, ...prev]);
  };
  const updateLead = (updated, { silent = false } = {}) => {
    const withScore = { ...updated, autoScore: computeAutoScore(updated) };
    persistLeads((prev) => prev.map((l) => (l.id === updated.id ? withScore : l)));
    setSelected(withScore);
    if (!silent) pushToast({ message: "Saved", duration: 1800 });
  };
  const deleteLead = (lead) => {
    persistLeads((prev) => prev.filter((l) => l.id !== lead.id));
    setSelected(null);
    pushToast({ message: `Deleted ${lead.name}`, actionLabel: "Undo", onAction: () => persistLeads((prev) => (prev.some((l) => l.id === lead.id) ? prev : [lead, ...prev])), duration: 6000 });
  };
  const handleDropCard = (leadId, groupValue, beforeLeadId) => { const groupField = subtab === "byType" ? "source" : "stage"; persistLeads((prev) => reorderAndMove(prev, leadId, groupField, groupValue, beforeLeadId)); };
  const findDuplicate = (form) => findDuplicateLead(leads, form);

  const addTask = (text) => persistTasks([{ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), text, done: false, createdAt: Date.now() }, ...tasks]);
  const toggleTask = (id) => persistTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const deleteTask = (id) => persistTasks(tasks.filter((t) => t.id !== id));

  const addTemplate = (form) => persistTemplates([...templates, { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), ...form }]);
  const updateTemplate = (id, form) => persistTemplates(templates.map((t) => (t.id === id ? { ...t, ...form } : t)));
  const deleteTemplate = (id) => persistTemplates(templates.filter((t) => t.id !== id));

  const filteredLeads = useMemo(() => leads.filter((l) => matchesSearch(l, search) && (bucketFilter === "all" || bucketOf(effectiveScore(l)) === bucketFilter)), [leads, search, bucketFilter]);

  if (showSplash) {
    return (
      <div onClick={() => setShowSplash(false)} className="flex flex-col items-center justify-center cursor-pointer anim-fadein" style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'Space Grotesk', sans-serif" }}>
        <style>{GLOBAL_STYLE}</style>
        <div className="anim-popin flex flex-col items-center">
          <BrandMark size="lg" />
          <div className="mt-7 flex items-center gap-2">
            <span className="w-6 h-px" style={{ background: COLORS.accent }} />
            <p className="text-xs uppercase tracking-widest" style={{ color: COLORS.inkSoft }}>Welcome. Click anywhere to continue.</p>
            <span className="w-6 h-px" style={{ background: COLORS.accent }} />
          </div>
        </div>
      </div>
    );
  }

  if (view === "capture") {
    const kCard = { background: KIOSK.surface, borderRadius: 8, border: `1px solid ${KIOSK.border}`, boxShadow: "0 10px 28px rgba(28,27,23,0.08)" };
    const handleKioskSubmit = (form) => {
      addLead(form);
      setKioskThanks(true);
      setTimeout(() => setKioskThanks(false), 2600);
    };
    return (
      <div className="anim-fadein" style={{ background: KIOSK.bg, minHeight: "100vh", fontFamily: "'Space Grotesk', sans-serif" }}>
        <style>{GLOBAL_STYLE}</style>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: KIOSK.surface, borderBottom: `1px solid ${KIOSK.border}` }}>
          <BrandMark size="sm" ink={KIOSK.ink} arc={KIOSK.border} />
          <button onClick={() => setView("dashboard")} aria-label="Exit to dashboard" title="Exit to dashboard" className="press w-9 h-9 rounded-full flex items-center justify-center" style={{ background: KIOSK.bg, border: `1px solid ${KIOSK.border}`, color: KIOSK.soft }}><X size={18} /></button>
        </div>
        <div className="max-w-md mx-auto pt-10 px-6 pb-12">
          {!kioskThanks && (
            <div className="text-center mb-6">
              <h1 style={{ fontFamily: "'Fraunces', serif", color: KIOSK.ink }} className="text-2xl">Welcome — sign in</h1>
              <p className="text-xs mt-1 uppercase tracking-wide" style={{ color: KIOSK.soft }}>Just a few details so we can follow up.</p>
            </div>
          )}

          {!kioskThanks && (
            <div className="flex flex-col items-center mb-6 p-5" style={kCard}>
              <QRPlaceholder light={KIOSK.surface} dark={KIOSK.ink} />
              <p className="text-xs mt-3 text-center" style={{ color: KIOSK.ink }}>Scan to save my contact card</p>
              <p className="text-[10px] mt-1 uppercase tracking-wide" style={{ color: COLORS.accent }}>Placeholder — swap in your real QR</p>
            </div>
          )}

          {kioskThanks ? (
            <div className="anim-popin flex flex-col items-center text-center p-10" style={kCard}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: COLORS.accent + "18" }}>
                <Check size={22} style={{ color: COLORS.accent }} />
              </div>
              <h2 style={{ fontFamily: "'Fraunces', serif", color: KIOSK.ink }} className="text-xl mb-1">Thanks — you're all set!</h2>
              <p className="text-sm" style={{ color: KIOSK.soft }}>We'll be in touch soon.</p>
            </div>
          ) : (
            <div className="p-6" style={kCard}>
              <LeadForm mode="capture" onSubmit={handleKioskSubmit} light />
            </div>
          )}
        </div>
        {error && <div className="max-w-md mx-auto mt-4 text-xs px-3 py-2 text-center" style={{ background: COLORS.accent + "18", color: COLORS.accent, borderRadius: 5 }}>{error}</div>}
      </div>
    );
  }

  const NAV_ITEMS = [
    { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { key: "add", label: "Quick Add", icon: UserPlus },
    { key: "tasks", label: "Tasks", icon: ListTodo },
    { key: "templates", label: "Templates", icon: MessageSquareText },
    { key: "commission", label: "Commission", icon: DollarSign },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];
  const SUBTABS = [
    { key: "pipeline", label: "Pipeline", icon: LayoutGrid },
    { key: "byType", label: "By Type", icon: Tags },
    { key: "followups", label: "Follow-ups", icon: BellRing },
    { key: "overview", label: "Overview", icon: BarChart3 },
  ];
  const BUCKET_CHIPS = [{ key: "all", label: "All" }, { key: "hot", label: "Hot" }, { key: "warm", label: "Warm" }, { key: "cold", label: "Cold" }];
  const showFilters = view === "dashboard" && (subtab === "pipeline" || subtab === "byType" || subtab === "followups");

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{GLOBAL_STYLE}</style>

      <div className="sticky top-0 z-20" style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <BrandMark size="sm" />
          <button onClick={() => setView("capture")} title="Launch Open House (locked client view)" className="press flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0" style={{ background: COLORS.accent, color: "#FBF3EF", borderRadius: 5 }}>
            <QrCode size={15} /> <span className="hidden sm:inline">Launch </span>Open House
          </button>
        </div>
        <div className="flex gap-4 sm:gap-5 px-4 sm:px-6 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_ITEMS.map(({ key, label: lbl, icon: Icon }) => (
            <button key={key} onClick={() => setView(key)} className={`navtab press flex items-center gap-1.5 pb-1 text-xs font-medium uppercase tracking-wide whitespace-nowrap flex-shrink-0 ${view === key ? "active" : ""}`} style={{ color: view === key ? COLORS.ink : COLORS.inkSoft }}>
              <Icon size={13} /> {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          {error && <div className="mb-4 text-xs px-3 py-2" style={{ background: COLORS.accentBright + "18", color: COLORS.accentBright, borderRadius: 5 }}>{error}</div>}

          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div key={view + subtab} className="anim-fadeup">
              {view === "add" ? (
                <div className="max-w-md mx-auto p-6" style={CARD}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.accentBright }}>Add a lead</p>
                  <LeadForm
                    mode="add"
                    onSubmit={(form) => { addLead(form); setView("dashboard"); setSubtab("pipeline"); pushToast({ message: `Added ${form.name}`, duration: 2200 }); }}
                    onCancel={() => setView("dashboard")}
                    checkDuplicate={findDuplicate}
                    onViewExisting={(l) => { setView("dashboard"); setSubtab("pipeline"); setSelected(l); }}
                  />
                </div>
              ) : view === "tasks" ? (
                <><h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-5">Tasks</h1><TasksTab tasks={tasks} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} /></>
              ) : view === "templates" ? (
                <><h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-5">Templates</h1><TemplatesTab templates={templates} onAdd={addTemplate} onUpdate={updateTemplate} onDelete={deleteTemplate} /></>
              ) : view === "commission" ? (
                <><h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-5">Commission</h1><CommissionTab leads={leads} settings={settings} /></>
              ) : view === "settings" ? (
                <><h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-5">Settings</h1><SettingsTab settings={settings} onSave={persistSettings} /></>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3 pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl">Dashboard</h1>
                    <div className="flex gap-4 sm:gap-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                      {SUBTABS.map(({ key, label: lbl, icon: Icon }) => (
                        <button key={key} onClick={() => setSubtab(key)} className={`navtab press flex items-center gap-1.5 pb-1 text-xs font-medium uppercase tracking-wide whitespace-nowrap flex-shrink-0 ${subtab === key ? "active" : ""}`} style={{ color: subtab === key ? COLORS.ink : COLORS.inkSoft }}>
                          <Icon size={13} /> {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {showFilters && (
                    <div className="flex items-center gap-3 mb-5 flex-wrap">
                      <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <Search size={14} style={{ color: COLORS.inkSoft, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email..." className="w-full pl-8 pr-3 py-2.5 text-sm outline-none" style={inputStyle} />
                      </div>
                      <div className="flex gap-1.5">
                        {BUCKET_CHIPS.map((c) => (
                          <button key={c.key} onClick={() => setBucketFilter(c.key)} className="press px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: bucketFilter === c.key ? "#FBF3EF" : COLORS.inkSoft, background: bucketFilter === c.key ? COLORS.accent : COLORS.surface2, border: `1px solid ${bucketFilter === c.key ? COLORS.accent : COLORS.border}`, borderRadius: 5 }}>{c.label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {subtab === "pipeline" && <Board leads={filteredLeads} groupField="stage" groups={STAGES} onSelect={setSelected} onDropCard={handleDropCard} />}
                  {subtab === "byType" && <Board leads={filteredLeads} groupField="source" groups={SOURCES} onSelect={setSelected} onDropCard={handleDropCard} />}
                  {subtab === "followups" && <FollowUps leads={filteredLeads} onSelect={setSelected} />}
                  {subtab === "overview" && <Overview leads={leads} />}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} onUpdate={updateLead} onDelete={deleteLead} templates={templates} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
