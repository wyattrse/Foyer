"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Building2,
  CalendarDays,
  FolderOpen,
  DollarSign,
  Settings as SettingsIcon,
  Sparkles,
  Plus,
  MoreHorizontal,
  X,
  UserPlus,
  Building,
  CalendarPlus,
  FileUp,
  QrCode,
} from "lucide-react";
import { COLORS, alpha } from "@/lib/theme";

export type NavKey = "dashboard" | "listings" | "tasks" | "files" | "commission" | "settings" | "assistant";
export type QuickAction = "lead" | "listing" | "event" | "file";

export const NAV_DESTINATIONS: { key: NavKey; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "listings", label: "Listings", icon: Building2 },
  { key: "tasks", label: "Tasks", icon: CalendarDays },
  { key: "files", label: "Files", icon: FolderOpen },
  { key: "commission", label: "Commission", icon: DollarSign },
  { key: "settings", label: "Settings", icon: SettingsIcon },
  { key: "assistant", label: "Foyer AI", icon: Sparkles },
];

const iconFor = (key: NavKey) => NAV_DESTINATIONS.find((d) => d.key === key)!.icon;
const labelFor = (key: NavKey) => NAV_DESTINATIONS.find((d) => d.key === key)!.label;

function SheetRow({ icon: Icon, label, onClick, accent }: { icon: LucideIcon; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="press w-full flex items-center gap-3.5 px-5 py-4 text-left"
      style={{ minHeight: 56 }}
    >
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? alpha(COLORS.accent, 14) : COLORS.surface2, color: accent ? COLORS.accentBright : COLORS.ink }}
      >
        <Icon size={18} />
      </span>
      <span className="text-[15px] font-medium" style={{ color: COLORS.ink }}>
        {label}
      </span>
    </button>
  );
}

function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sm:hidden fixed inset-0 z-50 flex items-end anim-fadein" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "#0A0A08CC", backdropFilter: "blur(3px)" }} />
      <div
        className="anim-slidein relative w-full pb-2"
        style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, borderRadius: "20px 20px 0 0", paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
            {title}
          </p>
          <button onClick={onClose} style={{ color: COLORS.inkSoft }}>
            <X size={18} />
          </button>
        </div>
        <div className="pb-1">{children}</div>
      </div>
    </div>
  );
}

export function BottomNav({
  activeView,
  onSelect,
  slots,
  kioskHref,
  onQuickAction,
  onOpenAssistant,
  assistantActive,
}: {
  activeView: string;
  onSelect: (key: NavKey) => void;
  slots: [NavKey, NavKey, NavKey];
  kioskHref: string;
  onQuickAction: (action: QuickAction) => void;
  onOpenAssistant: () => void;
  assistantActive: boolean;
}) {
  const [sheet, setSheet] = useState<"add" | "more" | null>(null);
  const moreItems = NAV_DESTINATIONS.filter((d) => !slots.includes(d.key) && d.key !== "assistant");

  const renderTab = (key: NavKey) => {
    const Icon = iconFor(key);
    const active = key === "assistant" ? assistantActive : activeView === key;
    return (
      <button
        key={key}
        onClick={() => (key === "assistant" ? onOpenAssistant() : onSelect(key))}
        className="flex-1 flex flex-col items-center gap-1.5 py-1"
      >
        <Icon size={22} style={{ color: active ? COLORS.accent : COLORS.inkSoft }} />
        <span className="text-[10px] font-medium" style={{ color: active ? COLORS.accent : COLORS.inkSoft }}>
          {labelFor(key)}
        </span>
      </button>
    );
  };

  return (
    <>
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-start pt-2"
        style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
      >
        {renderTab(slots[0])}
        {renderTab(slots[1])}
        <button onClick={() => setSheet("add")} className="flex-1 flex flex-col items-center gap-1" style={{ position: "relative", top: -16 }}>
          <span
            className="press flex items-center justify-center rounded-full"
            style={{ width: 54, height: 54, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentBright})`, boxShadow: `0 8px 20px ${alpha(COLORS.accent, 50)}` }}
          >
            <Plus size={24} color="#FBF3EF" />
          </span>
          <span className="text-[10px] font-medium" style={{ color: COLORS.inkSoft }}>
            Add
          </span>
        </button>
        {renderTab(slots[2])}
        <button onClick={() => setSheet("more")} className="flex-1 flex flex-col items-center gap-1.5 py-1">
          <MoreHorizontal size={22} style={{ color: COLORS.inkSoft }} />
          <span className="text-[10px] font-medium" style={{ color: COLORS.inkSoft }}>
            More
          </span>
        </button>
      </div>

      {sheet === "add" && (
        <BottomSheet title="Add" onClose={() => setSheet(null)}>
          <SheetRow
            icon={UserPlus}
            label="New lead"
            accent
            onClick={() => {
              setSheet(null);
              onQuickAction("lead");
            }}
          />
          <SheetRow
            icon={Building}
            label="New listing"
            accent
            onClick={() => {
              setSheet(null);
              onQuickAction("listing");
            }}
          />
          <SheetRow
            icon={CalendarPlus}
            label="New event"
            accent
            onClick={() => {
              setSheet(null);
              onQuickAction("event");
            }}
          />
          <SheetRow
            icon={FileUp}
            label="New file"
            accent
            onClick={() => {
              setSheet(null);
              onQuickAction("file");
            }}
          />
        </BottomSheet>
      )}

      {sheet === "more" && (
        <BottomSheet title="More" onClose={() => setSheet(null)}>
          {moreItems.map((d) => (
            <SheetRow
              key={d.key}
              icon={d.icon}
              label={d.label}
              onClick={() => {
                setSheet(null);
                onSelect(d.key);
              }}
            />
          ))}
          <SheetRow
            icon={QrCode}
            label="Open House"
            onClick={() => {
              setSheet(null);
              window.open(kioskHref, "_blank", "noopener,noreferrer");
            }}
          />
        </BottomSheet>
      )}
    </>
  );
}
