"use client";

import { useState } from "react";
import { Menu, QrCode, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { COLORS } from "@/lib/theme";

export function MobileNav({
  navItems,
  activeView,
  onSelect,
  kioskHref,
}: {
  navItems: readonly { key: string; label: string; icon: LucideIcon }[];
  activeView: string;
  onSelect: (key: string) => void;
  kioskHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="press w-9 h-9 flex items-center justify-center flex-shrink-0"
        style={{ color: COLORS.ink }}
      >
        <Menu size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex anim-fadein" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{ background: "#0A0A08CC", backdropFilter: "blur(3px)" }} />
          <div
            className="anim-slidein relative w-72 max-w-[80vw] h-full flex flex-col"
            style={{ background: COLORS.surface, borderRight: `1px solid ${COLORS.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <BrandMark size="sm" />
              <button onClick={() => setOpen(false)} aria-label="Close menu" style={{ color: COLORS.inkSoft }}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    onSelect(key);
                    setOpen(false);
                  }}
                  className="press flex items-center gap-3 w-full px-4 py-3.5 text-sm font-medium uppercase tracking-wide text-left"
                  style={{
                    color: activeView === key ? COLORS.ink : COLORS.inkSoft,
                    background: activeView === key ? COLORS.surface2 : "transparent",
                  }}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
            <a
              href={kioskHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="press flex items-center justify-center gap-2 m-4 py-3.5 text-sm font-medium"
              style={{ background: COLORS.accent, color: "#FBF3EF", borderRadius: 6 }}
            >
              <QrCode size={16} /> Open House
            </a>
          </div>
        </div>
      )}
    </>
  );
}
