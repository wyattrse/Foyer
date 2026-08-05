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
  MessageSquareText,
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
import { TemplatesTab } from "@/components/tabs/TemplatesTab";
import { CommissionTab } from "@/components/tabs/CommissionTab";
import { SettingsTab } from "@/components/tabs/SettingsTab";
import { ListingsTab } from "@/components/tabs/ListingsTab";
import { MobileNav } from "@/components/app/MobileNav";
import { CARD, COLORS, inputStyle } from "@/lib/theme";
import { STAGES, SOURCES } from "@/lib/constants";
import { findDuplicateLead, matchesSearch } from "@/lib/scoring";
import { reorderAndMove } from "@/lib/reorder";
import * as leadsApi from "@/lib/data/leads";
import * as interactionsApi from "@/lib/data/interactions";
import * as tasksApi from "@/lib/data/tasks";
import * as templatesApi from "@/lib/data/templates";
import * as agentApi from "@/lib/data/agent";
import * as listingsApi from "@/lib/data/listings";
import type { Agent, AgreementType, Interaction, LeadFormValues, LeadWithStatus, Listing, Task, Template } from "@/lib/types";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "add", label: "Quick Add", icon: UserPlus },
  { key: "listings", label: "Listings", icon: Building2 },
  { key: "tasks", label: "Tasks", icon: ListTodo },
  { key: "templates", label: "Templates", icon: MessageSquareText },
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
  const [agent, setAgent] = useState<Agent | null>(null);
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const addListing = async (form: { address: string; price: number | null; agreementType: AgreementType }) => {
    try {
      const l = await listingsApi.insertListing(supabase, userId, form);
      setListings((prev) => [l, ...prev]);
    } catch {
      setError("Couldn't save — your changes may not persist.");
    }
  };
  const updateListingHandler = async (id: string, form: { address: string; price: number | null; agreementType: AgreementType }) => {
    try {
      const updated = await listingsApi.updateListing(supabase, id, form);
      setListings((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch {
      setError("Couldn't save — your changes may not persist.");
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
        {/* Mobile: hamburger + centered logo that shrinks on scroll */}
        <div className={`sm:hidden flex items-center justify-between px-3 transition-all duration-300 ${scrolled ? "py-1.5" : "py-4"}`}>
          <MobileNav navItems={NAV_ITEMS} activeView={view} onSelect={setView} kioskHref={`/kiosk/${userId}`} />
          <div className={`transition-transform duration-300 ${scrolled ? "scale-[0.55]" : "scale-100"}`}>
            <BrandMark size="lg" />
          </div>
          <span className="w-9 flex-shrink-0" aria-hidden />
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

      <div className="p-3 sm:p-6">
        <div className="max-w-5xl mx-auto">
          {error && (
            <div className="mb-4 text-xs px-3 py-2" style={{ background: COLORS.accentBright + "18", color: COLORS.accentBright, borderRadius: 5 }}>
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
                  />
                </>
              ) : view === "tasks" ? (
                <>
                  <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-3 sm:mb-5">
                    Tasks
                  </h1>
                  <TasksTab tasks={tasks} onAdd={addTask} onToggle={toggleTask} onDelete={deleteTask} />
                </>
              ) : view === "templates" ? (
                <>
                  <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-2xl mb-3 sm:mb-5">
                    Templates
                  </h1>
                  <TemplatesTab templates={templates} onAdd={addTemplate} onUpdate={updateTemplate} onDelete={deleteTemplate} />
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
                  <SettingsTab agent={agent} onSave={saveSettings} onSignOut={signOut} />
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
                          className={`navtab press flex items-center gap-1.5 pb-1 text-xs font-medium uppercase tracking-wide whitespace-nowrap flex-shrink-0 ${subtab === key ? "active" : ""}`}
                          style={{ color: subtab === key ? COLORS.ink : COLORS.inkSoft }}
                        >
                          <Icon size={13} /> {lbl}
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
                            className="press px-3 py-1.5 text-xs font-medium uppercase tracking-wide"
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

                  {subtab === "pipeline" && <Board leads={filteredLeads} groupField="stage" groups={STAGES} onSelect={(l) => setSelectedId(l.id)} onDropCard={handleDropCard} />}
                  {subtab === "byType" && <Board leads={filteredLeads} groupField="source" groups={SOURCES} onSelect={(l) => setSelectedId(l.id)} onDropCard={handleDropCard} />}
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
    </div>
  );
}
