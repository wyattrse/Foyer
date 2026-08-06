"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  LayoutGrid,
  Tags,
  QrCode,
  ListTodo,
  Settings as SettingsIcon,
  FolderOpen,
  DollarSign,
  BellRing,
  BarChart3,
  Search,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlobalStyle } from "@/components/ui/GlobalStyle";
import { BrandMark } from "@/components/ui/BrandMark";
import { LoadingSkeleton } from "@/components/ui/Skeleton";
import { ToastStack, useToasts } from "@/components/ui/Toast";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { Board } from "@/components/leads/Board";
import { FollowUps } from "@/components/leads/FollowUps";
import { Overview } from "@/components/leads/Overview";
import { TasksTab } from "@/components/tabs/TasksTab";
import { FilesTab } from "@/components/tabs/FilesTab";
import { CommissionTab } from "@/components/tabs/CommissionTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { ListingsTab } from "@/components/tabs/ListingsTab";
import { DashboardStats } from "@/components/leads/DashboardStats";
import { CalendarTab } from "@/components/calendar/CalendarTab";
import { BottomNav, type NavKey, type QuickAction } from "@/components/app/BottomNav";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { CARD, COLORS, alpha, inputStyle } from "@/lib/theme";
import { STAGES, SOURCES } from "@/lib/constants";
import { findDuplicateLead, matchesSearch } from "@/lib/scoring";
import { reorderAndMove } from "@/lib/reorder";
import { canConvertToPdf, convertBlobToPdf, pdfNameFor } from "@/lib/pdfConvert";
import * as leadsApi from "@/lib/data/leads";
import * as interactionsApi from "@/lib/data/interactions";
import * as tasksApi from "@/lib/data/tasks";
import * as templatesApi from "@/lib/data/templates";
import * as agentApi from "@/lib/data/agent";
import * as listingsApi from "@/lib/data/listings";
import * as calendarApi from "@/lib/data/calendar";
import * as filesApi from "@/lib/data/files";
import type { Agent, AgreementType, CalendarEvent, FileRecord, Interaction, LeadFormValues, LeadWithStatus, Listing, Task, Template } from "@/lib/types";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "add", label: "Quick Add", icon: UserPlus },
  { key: "listings", label: "Listings", icon: Building2 },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "files", label: "Files", icon: FolderOpen },
  { key: "commission", label: "Commission", icon: DollarSign },
  { key: "settings", label: "Settings", icon: SettingsIcon },
] as const;

const SUBTABS = [
  { key: "pipeline", label: "Pipeline", icon: LayoutGrid },
  { key: "byType", label: "By Type", icon: Tags },
  { key: "followups", label: "Follow-ups", icon: BellRing },
  { key: "overview", label: "Overview", icon: BarChart3 },
] as const;

const BUCKET_CHIPS = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "warm", label: "Warm" },
  { key: "cold", label: "Cold" },
] as const;

export function DashboardApp({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [leads, setLeads] = useState<LeadWithStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  // Set while the AI assistant is executing an approved action, so the
  // affected card can glow in place -- cleared a moment after so the user
  // actually catches it even on a fast round trip.
  const [aiActiveTarget, setAiActiveTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<string>("dashboard");
  const [subtab, setSubtab] = useState<string>("pipeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedInteractions, setSelectedInteractions] = useState<Interaction[]>([]);
  // Derived, not synced via effect: always reflects the freshest row in `leads`.
  const selected = useMemo(() => (selectedId ? (leads.find((l) => l.id === selectedId) ?? null) : null), [selectedId, leads]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<string>("all");
  const { toasts, pushToast, dismissToast } = useToasts();
  const [scrolled, setScrolled] = useState(false);
  const [themeMode, setThemeModeState] = useState<"dark" | "light">("dark");
  const [uiScale, setUiScaleState] = useState<"small" | "medium" | "large">("medium");
  const [bottomNavSlots, setBottomNavSlotsState] = useState<[NavKey, NavKey, NavKey]>(["dashboard", "listings", "tasks"]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  // Bumped to signal "open the add form" to a tab that isn't mounted from a
  // click inside it -- see openTrigger on ListingsTab/CalendarTab.
  const [listingAddTrigger, setListingAddTrigger] = useState(0);
  const [eventAddTrigger, setEventAddTrigger] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Restore-only: reads the saved preference once on mount and applies it.
  // Actively changing the theme goes through setThemeMode below instead of a
  // reactive effect, so there's no race between "restore" and "persist".
  useEffect(() => {
    const stored = localStorage.getItem("foyer-theme");
    if (stored === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage on mount, not derivable from props/state
      setThemeModeState("light");
    }
  }, []);

  // Same restore-only pattern as theme above.
  useEffect(() => {
    const stored = localStorage.getItem("foyer-ui-scale");
    if (stored === "small" || stored === "large") {
      document.documentElement.setAttribute("data-ui-scale", stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage on mount, not derivable from props/state
      setUiScaleState(stored);
    }
  }, []);

  const setUiScale = (scale: "small" | "medium" | "large") => {
    setUiScaleState(scale);
    if (scale === "medium") document.documentElement.removeAttribute("data-ui-scale");
    else document.documentElement.setAttribute("data-ui-scale", scale);
    localStorage.setItem("foyer-ui-scale", scale);
  };

  // Same restore-only pattern as theme above.
  useEffect(() => {
    const stored = localStorage.getItem("foyer-bottom-nav");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 3) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage on mount
        setBottomNavSlotsState(parsed as [NavKey, NavKey, NavKey]);
      }
    } catch {
      // Ignore malformed stored value -- default slots stand.
    }
  }, []);

  const setBottomNavSlots = (slots: [NavKey, NavKey, NavKey]) => {
    setBottomNavSlotsState(slots);
    localStorage.setItem("foyer-bottom-nav", JSON.stringify(slots));
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action === "lead") setView("add");
    else if (action === "listing") {
      setView("listings");
      setListingAddTrigger((t) => t + 1);
      // Clear right after handoff so a later plain visit to Listings (with
      // the trigger left nonzero) doesn't reopen the add form every time.
      setTimeout(() => setListingAddTrigger(0), 0);
    } else if (action === "event") {
      setView("tasks");
      setEventAddTrigger((t) => t + 1);
      setTimeout(() => setEventAddTrigger(0), 0);
    } else if (action === "file") {
      setView("files");
    }
  };

  const setThemeMode = (mode: "dark" | "light") => {
    setThemeModeState(mode);
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("foyer-theme", mode);
  };

  const refreshLeads = useCallback(async () => {
    try {
      const data = await leadsApi.fetchLeads(supabase);
      setLeads(data);
      return data;
    } catch {
      setError("Couldn't load leads.");
      return [];
    }
  }, [supabase]);

  // Live sync: another device (e.g. the kiosk) creating/changing a lead
  // updates this dashboard without a manual refresh. RLS already scopes
  // this to the agent's own leads.
  useEffect(() => {
    const channel = supabase
      .channel("leads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads", filter: `agent_id=eq.${userId}` }, () => {
        refreshLeads();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refreshLeads]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [leadsData, tasksData, templatesData, agentData, listingsData] = await Promise.all([
          leadsApi.fetchLeads(supabase),
          tasksApi.fetchTasks(supabase),
          templatesApi.fetchTemplates(supabase),
          agentApi.fetchAgent(supabase, userId),
          listingsApi.fetchListings(supabase),
        ]);
        setLeads(leadsData);
        setTasks(tasksData);
        setTemplates(templatesData);
        setAgent(agentData);
        setListings(listingsData);
      } catch {
        setError("Couldn't load your data.");
      } finally {
        setLoading(false);
      }
      // Calendar and Files depend on migrations 0008/0009 -- fetched
      // separately so a not-yet-run migration doesn't block the rest of
      // the dashboard from loading.
      try {
        setCalendarEvents(await calendarApi.fetchEvents(supabase));
      } catch {
        // Table may not exist yet; Calendar tab will just show empty.
      }
      try {
        setFiles(await filesApi.fetchFiles(supabase));
      } catch {
        // Table may not exist yet; Files tab will just show empty.
      }
    })();
  }, [supabase, userId]);

  useEffect(() => {
    if (!selectedId) return;
    interactionsApi
      .fetchInteractions(supabase, selectedId)
      .then(setSelectedInteractions)
      .catch(() => setError("Couldn't load interaction log."));
  }, [selectedId, supabase]);

  const addLead = async (form: LeadFormValues): Promise<boolean> => {
    try {
      await leadsApi.insertLead(supabase, userId, form);
      await refreshLeads();
      return true;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return false;
    }
  };

  const addLeadForAssistant = async (form: LeadFormValues) => {
    try {
      const lead = await leadsApi.insertLead(supabase, userId, form);
      await refreshLeads();
      return lead;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };

  const updateLead = async (patch: Record<string, unknown>, opts: { silent?: boolean } = {}) => {
    if (!selected) return;
    try {
      await leadsApi.updateLead(supabase, selected.id, patch);
      await refreshLeads();
      if (!opts.silent) pushToast({ message: "Saved", duration: 1800 });
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };

  const logInteractionForSelected = async (text: string) => {
    if (!selected) return;
    try {
      await interactionsApi.logInteraction(supabase, selected.id, text);
      const [freshInteractions] = await Promise.all([
        interactionsApi.fetchInteractions(supabase, selected.id),
        refreshLeads(), // next_touch_due depends on the latest interaction
      ]);
      setSelectedInteractions(freshInteractions);
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };

  const deleteLeadForAssistant = async (id: string) => {
    try {
      await leadsApi.softDeleteLead(supabase, id);
      if (selectedId === id) setSelectedId(null);
      await refreshLeads();
      return true;
    } catch {
      setError("Couldn't delete — try again.");
      return false;
    }
  };

  const logInteractionForAssistant = async (leadId: string, text: string) => {
    try {
      await interactionsApi.logInteraction(supabase, leadId, text);
      await refreshLeads(); // next_touch_due depends on the latest interaction
      if (selectedId === leadId) {
        setSelectedInteractions(await interactionsApi.fetchInteractions(supabase, leadId));
      }
      return true;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return false;
    }
  };

  const deleteLead = async (lead: LeadWithStatus) => {
    try {
      await leadsApi.softDeleteLead(supabase, lead.id);
      setSelectedId(null);
      await refreshLeads();
      pushToast({
        message: `Deleted ${lead.name}`,
        actionLabel: "Undo",
        onAction: async () => {
          await leadsApi.undoDeleteLead(supabase, lead.id);
          await refreshLeads();
        },
        duration: 6000,
      });
    } catch {
      setError("Couldn't delete — try again.");
    }
  };

  const handleDropCard = async (leadId: string, groupValue: string, beforeLeadId: string | null) => {
    const groupField = subtab === "byType" ? "source" : "stage";
    const { next, patches } = reorderAndMove(leads, leadId, groupField, groupValue, beforeLeadId);
    setLeads(next);
    try {
      await leadsApi.persistReorderPatches(supabase, patches);
    } catch {
      setError("Couldn't save the new order — try again.");
      await refreshLeads();
    }
  };

  const findDuplicate = (form: LeadFormValues) => findDuplicateLead(leads, form);

  const addTask = async (text: string) => {
    try {
      const t = await tasksApi.insertTask(supabase, userId, text);
      setTasks((prev) => [t, ...prev]);
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };
  const toggleTask = async (id: string) => {
    const t = tasks.find((t) => t.id === id);
    if (!t) return;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
    try {
      await tasksApi.setTaskDone(supabase, id, !t.done);
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };
  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await tasksApi.deleteTask(supabase, id);
    } catch {
      setError("Couldn't delete — try again.");
    }
  };

  const addTaskForAssistant = async (text: string) => {
    try {
      const t = await tasksApi.insertTask(supabase, userId, text);
      setTasks((prev) => [t, ...prev]);
      return t;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const completeTaskForAssistant = async (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
    try {
      await tasksApi.setTaskDone(supabase, id, true);
      return true;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return false;
    }
  };
  const deleteTaskForAssistant = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await tasksApi.deleteTask(supabase, id);
      return true;
    } catch {
      setError("Couldn't delete — try again.");
      return false;
    }
  };

  const addTemplate = async (form: { title: string; body: string }) => {
    try {
      const t = await templatesApi.insertTemplate(supabase, userId, form);
      setTemplates((prev) => [...prev, t]);
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };
  const updateTemplate = async (id: string, form: { title: string; body: string }) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...form } : t)));
    try {
      await templatesApi.updateTemplate(supabase, id, form);
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };
  const deleteTemplate = async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try {
      await templatesApi.deleteTemplate(supabase, id);
    } catch {
      setError("Couldn't delete — try again.");
    }
  };

  const addTemplateForAssistant = async (form: { title: string; body: string }) => {
    try {
      const t = await templatesApi.insertTemplate(supabase, userId, form);
      setTemplates((prev) => [...prev, t]);
      return t;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const updateTemplateForAssistant = async (id: string, form: { title?: string; body?: string }) => {
    const existing = templates.find((t) => t.id === id);
    if (!existing) return null;
    const merged = { title: form.title ?? existing.title, body: form.body ?? existing.body };
    const updated: Template = { ...existing, ...merged };
    setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    try {
      await templatesApi.updateTemplate(supabase, id, merged);
      return updated;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const deleteTemplateForAssistant = async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try {
      await templatesApi.deleteTemplate(supabase, id);
      return true;
    } catch {
      setError("Couldn't delete — try again.");
      return false;
    }
  };

  // -------- Calendar --------
  const refreshEvents = async () => {
    try {
      setCalendarEvents(await calendarApi.fetchEvents(supabase));
    } catch {
      setError("Couldn't load calendar events.");
    }
  };
  const addEvent = async (form: Parameters<typeof calendarApi.insertEvent>[2]) => {
    try {
      const ev = await calendarApi.insertEvent(supabase, userId, form);
      setCalendarEvents((prev) => [...prev, ev].sort((a, b) => a.start_at.localeCompare(b.start_at)));
      return ev;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const updateEventHandler = async (id: string, form: Parameters<typeof calendarApi.updateEvent>[2]) => {
    try {
      const ev = await calendarApi.updateEvent(supabase, id, form);
      setCalendarEvents((prev) => prev.map((e) => (e.id === id ? ev : e)).sort((a, b) => a.start_at.localeCompare(b.start_at)));
      return ev;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const deleteEventHandler = async (id: string) => {
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await calendarApi.deleteEvent(supabase, id);
      return true;
    } catch {
      setError("Couldn't delete — try again.");
      await refreshEvents();
      return false;
    }
  };

  // -------- Files --------
  const uploadFileHandler = async (file: File, leadId: string | null) => {
    try {
      const f = await filesApi.uploadFile(supabase, userId, file, leadId);
      setFiles((prev) => [f, ...prev]);
    } catch {
      setError("Couldn't upload — try again.");
    }
  };
  const downloadFileHandler = async (file: FileRecord) => {
    try {
      const blob = await filesApi.downloadFile(supabase, file.storage_path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't download — try again.");
    }
  };
  const deleteFileHandler = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    try {
      await filesApi.deleteFile(supabase, id, file.storage_path);
    } catch {
      setError("Couldn't delete — try again.");
    }
  };
  const attachFileToLeadHandler = async (id: string, leadId: string | null) => {
    try {
      const updated = await filesApi.attachFileToLead(supabase, id, leadId);
      setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };
  const convertFileToPdfHandler = async (file: FileRecord) => {
    if (!canConvertToPdf(file.mime_type, file.name)) {
      setError("That file type can't be converted to PDF yet — only images and plain text are supported.");
      return;
    }
    try {
      const blob = await filesApi.downloadFile(supabase, file.storage_path);
      const pdfBlob = await convertBlobToPdf(blob, file.mime_type);
      const pdfName = pdfNameFor(file.name);
      const saved = await filesApi.uploadBlobAsFile(supabase, userId, pdfBlob, pdfName, "application/pdf", file.lead_id);
      setFiles((prev) => [saved, ...prev]);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't convert that file — try again.");
    }
  };

  // -------- AI assistant wrappers (return values for confirmation UI) --------
  const addEventForAssistant = async (form: { title: string; notes: string | null; startAt: string; endAt: string | null; leadId: string | null; listingId: string | null }) =>
    addEvent(form);
  const updateEventForAssistant = async (
    id: string,
    form: Partial<{ title: string; notes: string | null; startAt: string; endAt: string | null; leadId: string | null; listingId: string | null }>,
  ) => updateEventHandler(id, form);
  const deleteEventForAssistant = async (id: string) => deleteEventHandler(id);
  const renameFileForAssistant = async (id: string, name: string) => {
    try {
      const updated = await filesApi.renameFile(supabase, id, name);
      setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
      return updated;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const attachFileForAssistant = async (id: string, leadId: string | null) => {
    try {
      const updated = await filesApi.attachFileToLead(supabase, id, leadId);
      setFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
      return updated;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const deleteFileForAssistant = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return false;
    setFiles((prev) => prev.filter((f) => f.id !== id));
    try {
      await filesApi.deleteFile(supabase, id, file.storage_path);
      return true;
    } catch {
      setError("Couldn't delete — try again.");
      return false;
    }
  };
  const convertFileForAssistant = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return false;
    if (!canConvertToPdf(file.mime_type, file.name)) return false;
    try {
      await convertFileToPdfHandler(file);
      return true;
    } catch {
      return false;
    }
  };

  const addListing = async (form: { address: string; price: number | null; agreementType: AgreementType; description?: string | null }) => {
    try {
      const l = await listingsApi.insertListing(supabase, userId, form);
      setListings((prev) => [l, ...prev]);
      return l;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const updateListingHandler = async (
    id: string,
    form: { address: string; price: number | null; agreementType: AgreementType; description?: string | null },
  ) => {
    try {
      const updated = await listingsApi.updateListing(supabase, id, form);
      setListings((prev) => prev.map((l) => (l.id === id ? updated : l)));
      return updated;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const patchListingHandler = async (id: string, patch: Parameters<typeof listingsApi.patchListing>[2]) => {
    try {
      const updated = await listingsApi.patchListing(supabase, id, patch);
      setListings((prev) => prev.map((l) => (l.id === id ? updated : l)));
      return updated;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const updateLeadById = async (id: string, patch: Record<string, unknown>) => {
    try {
      const updated = await leadsApi.updateLead(supabase, id, patch);
      await refreshLeads();
      return updated;
    } catch {
      setError("Couldn't save — your changes may not persist.");
      return null;
    }
  };
  const deleteListingHandler = async (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    try {
      await listingsApi.deleteListing(supabase, id);
    } catch {
      setError("Couldn't delete — try again.");
      await refreshListings();
    }
  };
  const deleteListingForAssistant = async (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    try {
      await listingsApi.deleteListing(supabase, id);
      return true;
    } catch {
      setError("Couldn't delete — try again.");
      await refreshListings();
      return false;
    }
  };
  const refreshListings = async () => {
    try {
      setListings(await listingsApi.fetchListings(supabase));
    } catch {
      setError("Couldn't load listings.");
    }
  };

  const saveSettings = async (patch: { name: string; brokerage: string; commission_split: number }) => {
    try {
      const updated = await agentApi.updateAgent(supabase, userId, patch);
      setAgent(updated);
      pushToast({ message: "Saved", duration: 1800 });
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const filteredLeads = useMemo(
    () => leads.filter((l) => matchesSearch(l, search) && (bucketFilter === "all" || l.bucket === bucketFilter)),
    [leads, search, bucketFilter],
  );

  if (showSplash) {
    return (
      <div
        onClick={() => setShowSplash(false)}
        className="flex flex-col items-center justify-center cursor-pointer anim-fadein"
        style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <GlobalStyle />
        <div className="anim-popin flex flex-col items-center">
          <BrandMark size="lg" />
          <div className="mt-7 flex items-center gap-2">
            <span className="w-6 h-px" style={{ background: COLORS.accent }} />
            <p className="text-xs uppercase tracking-widest" style={{ color: COLORS.inkSoft }}>
              Welcome. Click anywhere to continue.
            </p>
            <span className="w-6 h-px" style={{ background: COLORS.accent }} />
          </div>
        </div>
      </div>
    );
  }

  const showFilters = view === "dashboard" && (subtab === "pipeline" || subtab === "byType" || subtab === "followups");

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'Space Grotesk', sans-serif" }}>
      <GlobalStyle />

      <div className="sticky top-0 z-20" style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
        {/* Mobile: centered logo that shrinks on scroll -- navigation lives in the bottom tab bar.
            paddingTop never goes below the safe area, so the logo can't land under a notch/Dynamic
            Island regardless of scroll state; the shrink animation still reads via the scale below. */}
        <div
          className={`sm:hidden flex items-center justify-center px-3 transition-all duration-300 ${scrolled ? "pb-1.5" : "pb-4"}`}
          style={{ paddingTop: scrolled ? "max(6px, env(safe-area-inset-top))" : "max(16px, env(safe-area-inset-top))" }}
        >
          <div className={`transition-transform duration-300 ${scrolled ? "scale-[0.55]" : "scale-100"}`}>
            <BrandMark size="lg" />
          </div>
        </div>

        {/* Desktop: unchanged horizontal nav */}
        <div className="hidden sm:flex items-center justify-between gap-3 px-6 py-3">
          <BrandMark size="sm" />
          <a
            href={`/kiosk/${userId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the client-facing kiosk sign-in in a new tab"
            className="press flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap flex-shrink-0"
            style={{ background: COLORS.accent, color: "#FBF3EF", borderRadius: 5 }}
          >
            <QrCode size={15} /> Launch Open House
          </a>
        </div>
        <div className="hidden sm:flex gap-5 px-6 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_ITEMS.map(({ key, label: lbl, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`navtab press flex items-center gap-1.5 pb-1 text-xs font-medium uppercase tracking-wide whitespace-nowrap flex-shrink-0 ${view === key ? "active" : ""}`}
              style={{ color: view === key ? COLORS.ink : COLORS.inkSoft }}
            >
              <Icon size={13} /> {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 pb-28 sm:p-6">
        <div className="max-w-[1800px] mx-auto">
          {error && (
            <div className="mb-4 text-xs px-3 py-2" style={{ background: alpha(COLORS.accentBright, 9), color: COLORS.accentBright, borderRadius: 5 }}>
              {error}
            </div>
          )}

          {loading || !agent ? (
            <LoadingSkeleton />
          ) : (
            <div key={view + subtab} className="anim-fadeup">
              {view === "add" ? (
                <div className="max-w-md mx-auto p-6" style={CARD}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.accentBright }}>
                    Add a lead
                  </p>
                  <LeadForm
                    mode="add"
                    onSubmit={async (form) => {
                      const ok = await addLead(form);
                      if (!ok) return;
                      setView("dashboard");
                      setSubtab("pipeline");
                      pushToast({ message: `Added ${form.name}`, duration: 2200 });
                    }}
                    onCancel={() => setView("dashboard")}
                    checkDuplicate={findDuplicate}
                    onViewExisting={(l) => {
                      setView("dashboard");
                      setSubtab("pipeline");
                      setSelectedId(l.id);
                    }}
                  />
                </div>
              ) : view === "listings" ? (
                <>
                  <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-3 sm:mb-5">
                    Listings
                  </h1>
                  <ListingsTab
                    listings={listings}
                    leads={leads}
                    onAdd={addListing}
                    onUpdate={updateListingHandler}
                    onDelete={deleteListingHandler}
                    onSelectLead={(l) => setSelectedId(l.id)}
                    highlightedListingId={aiActiveTarget}
                    openTrigger={listingAddTrigger}
                  />
                </>
              ) : view === "tasks" ? (
                <>
                  <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-3 sm:mb-5">
                    Tasks
                  </h1>
                  <TasksTab tasks={tasks} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} highlightedTaskId={aiActiveTarget} />
                  <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLORS.inkSoft }}>
                      Calendar
                    </p>
                    <CalendarTab
                      events={calendarEvents}
                      leads={leads}
                      listings={listings}
                      highlightedEventId={aiActiveTarget}
                      onAdd={addEvent}
                      onUpdate={updateEventHandler}
                      onDelete={deleteEventHandler}
                      openTrigger={eventAddTrigger}
                    />
                  </div>
                </>
              ) : view === "files" ? (
                <>
                  <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-3 sm:mb-5">
                    Files
                  </h1>
                  <FilesTab
                    files={files}
                    leads={leads}
                    templates={templates}
                    highlightedFileId={aiActiveTarget}
                    onUpload={uploadFileHandler}
                    onDownload={downloadFileHandler}
                    onDelete={deleteFileHandler}
                    onAttachToLead={attachFileToLeadHandler}
                    onConvertToPdf={convertFileToPdfHandler}
                    onAddTemplate={addTemplate}
                    onUpdateTemplate={updateTemplate}
                    onDeleteTemplate={deleteTemplate}
                  />
                </>
              ) : view === "commission" ? (
                <>
                  <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-3 sm:mb-5">
                    Commission
                  </h1>
                  <CommissionTab leads={leads} agent={agent} />
                </>
              ) : view === "settings" ? (
                <>
                  <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-3 sm:mb-5">
                    Settings
                  </h1>
                  <SettingsTab
                    agent={agent}
                    onSave={saveSettings}
                    onSignOut={signOut}
                    themeMode={themeMode}
                    onThemeChange={setThemeMode}
                    uiScale={uiScale}
                    onUiScaleChange={setUiScale}
                    bottomNavSlots={bottomNavSlots}
                    onBottomNavSlotsChange={setBottomNavSlots}
                  />
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-5 gap-2 sm:gap-3 pb-3 sm:pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl">
                      Dashboard
                    </h1>
                    <div className="flex gap-4 sm:gap-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                      {SUBTABS.map(({ key, label: lbl, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setSubtab(key)}
                          className={`navtab press flex items-center gap-1.5 py-2 sm:py-0 sm:pb-1 text-sm sm:text-xs font-medium uppercase tracking-wide whitespace-nowrap flex-shrink-0 ${subtab === key ? "active" : ""}`}
                          style={{ color: subtab === key ? COLORS.ink : COLORS.inkSoft }}
                        >
                          <Icon size={15} className="sm:hidden" />
                          <Icon size={13} className="hidden sm:block" />
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {showFilters && (
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5 flex-wrap">
                      <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <Search size={14} style={{ color: COLORS.inkSoft, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search name, phone, email..."
                          className="w-full pl-8 pr-3 py-2.5 text-sm outline-none"
                          style={inputStyle}
                        />
                      </div>
                      <div className="flex gap-1.5">
                        {BUCKET_CHIPS.map((c) => (
                          <button
                            key={c.key}
                            onClick={() => setBucketFilter(c.key)}
                            className="press px-3.5 py-2 sm:px-3 sm:py-1.5 text-sm sm:text-xs font-medium uppercase tracking-wide"
                            style={{
                              color: bucketFilter === c.key ? "#FBF3EF" : COLORS.inkSoft,
                              background: bucketFilter === c.key ? COLORS.accent : COLORS.surface2,
                              border: `1px solid ${bucketFilter === c.key ? COLORS.accent : COLORS.border}`,
                              borderRadius: 5,
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {subtab === "pipeline" && (
                    <>
                      <DashboardStats leads={leads} listings={listings} tasks={tasks} />
                      <Board leads={filteredLeads} groupField="stage" groups={STAGES} onSelect={(l) => setSelectedId(l.id)} onDropCard={handleDropCard} highlightedLeadId={aiActiveTarget} />
                    </>
                  )}
                  {subtab === "byType" && (
                    <Board leads={filteredLeads} groupField="source" groups={SOURCES} onSelect={(l) => setSelectedId(l.id)} onDropCard={handleDropCard} highlightedLeadId={aiActiveTarget} />
                  )}
                  {subtab === "followups" && <FollowUps leads={filteredLeads} onSelect={(l) => setSelectedId(l.id)} />}
                  {subtab === "overview" && <Overview leads={leads} />}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <LeadDetail
          lead={selected}
          interactions={selectedInteractions}
          templates={templates}
          onClose={() => setSelectedId(null)}
          onUpdate={updateLead}
          onLogInteraction={logInteractionForSelected}
          onDelete={() => deleteLead(selected)}
        />
      )}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {!loading && (
        <AssistantPanel
          agentName={agent?.name ?? ""}
          leads={leads}
          listings={listings}
          tasks={tasks}
          templates={templates}
          events={calendarEvents}
          files={files}
          onCreateLead={addLeadForAssistant}
          onUpdateLead={updateLeadById}
          onDeleteLead={deleteLeadForAssistant}
          onLogInteraction={logInteractionForAssistant}
          onCreateListing={addListing}
          onUpdateListing={patchListingHandler}
          onDeleteListing={deleteListingForAssistant}
          onCreateTask={addTaskForAssistant}
          onCompleteTask={completeTaskForAssistant}
          onDeleteTask={deleteTaskForAssistant}
          onCreateTemplate={addTemplateForAssistant}
          onUpdateTemplate={updateTemplateForAssistant}
          onDeleteTemplate={deleteTemplateForAssistant}
          onCreateEvent={addEventForAssistant}
          onUpdateEvent={updateEventForAssistant}
          onDeleteEvent={deleteEventForAssistant}
          onAttachFileToLead={attachFileForAssistant}
          onRenameFile={renameFileForAssistant}
          onDeleteFile={deleteFileForAssistant}
          onConvertFileToPdf={convertFileForAssistant}
          onActionTarget={setAiActiveTarget}
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          dockedInNav={bottomNavSlots.includes("assistant")}
        />
      )}
      {!loading && (
        <BottomNav
          activeView={view}
          onSelect={(key) => setView(key)}
          slots={bottomNavSlots}
          kioskHref={`/kiosk/${userId}`}
          onQuickAction={handleQuickAction}
          onOpenAssistant={() => setAssistantOpen(true)}
          assistantActive={assistantOpen}
        />
      )}
    </div>
  );
}
