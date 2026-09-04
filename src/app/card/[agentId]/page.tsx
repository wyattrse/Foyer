"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Phone, Mail, MessageSquare, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlobalStyle } from "@/components/ui/GlobalStyle";
import { BrandMark } from "@/components/ui/BrandMark";
import { COLORS, alpha } from "@/lib/theme";
import { buildAgentVCard } from "@/lib/vcard";

type CardAgent = {
  name: string;
  brokerage: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  logo_url: string | null;
};

// Genuinely unauthenticated route, same architecture as /kiosk/[agentId]:
// reads from the kiosk_agent_info view, which deliberately bypasses the
// agents table's normal agent-only RLS to expose a safe public subset.
//
// Unlike the kiosk page (deliberately light -- a stranger walking up
// shouldn't meet a black screen), this card is a shared link the agent
// sends out themselves, so it uses Foyer's dark brand theme directly via
// COLORS rather than the light KIOSK palette.
//
// Two structurally different layouts, not one layout squeezed by
// breakpoints: phones (sharing 1:1 with a client) get a full-screen
// vertical card; tablets/desktop (propped up at an open house) get a
// large horizontal card, since a portrait phone shape looks cramped when
// just stretched wide.
export default function DigitalCardPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const supabase = useMemo(() => createClient(), []);
  const [agent, setAgent] = useState<CardAgent | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("kiosk_agent_info")
      .select("name, brokerage, phone, email, photo_url, logo_url")
      .eq("id", agentId)
      .single()
      .then(({ data }) => {
        if (data) setAgent(data);
        else setNotFound(true);
      });
  }, [supabase, agentId]);

  const cardChrome = {
    background: COLORS.surface,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
  };

  const saveContact = () => {
    if (!agent) return;
    const vcard = buildAgentVCard(agent);
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agent.name.replace(/\s+/g, "_")}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Logos are pre-framed to a 2.4:1 crop in Settings, so this just displays
  // them at that same aspect -- no background chip or border, since that
  // read as a box squeezing the logo down rather than framing it.
  const logoChip = (sizeClass: string) =>
    agent?.logo_url && (
      <div className={`${sizeClass} flex-shrink-0 flex items-center justify-center`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- agent-controlled Storage URL, not an optimizable static asset */}
        <img src={agent.logo_url} alt={`${agent.brokerage ?? "Brokerage"} logo`} className="max-w-full max-h-full object-contain" />
      </div>
    );

  if (notFound) {
    return (
      <div className="anim-fadein flex items-center justify-center" style={{ background: COLORS.bg, minHeight: "100vh" }}>
        <GlobalStyle />
        <p className="text-sm" style={{ color: COLORS.inkSoft, fontFamily: "'Space Grotesk', sans-serif" }}>
          We couldn&apos;t find this contact card.
        </p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="anim-fadein flex items-center justify-center" style={{ background: COLORS.bg, minHeight: "100vh" }}>
        <GlobalStyle />
        <p className="skeleton-pulse text-sm" style={{ color: alpha(COLORS.inkSoft, 60), fontFamily: "'Space Grotesk', sans-serif" }}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="anim-fadein" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <GlobalStyle />

      {/* ---------- Mobile: full-screen vertical card ---------- */}
      <div className="md:hidden flex flex-col" style={{ background: COLORS.bg, minHeight: "100vh" }}>
        <div className="flex items-center justify-center px-6 pb-4" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
          <BrandMark size="sm" ink={COLORS.ink} arc={COLORS.border} />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="w-full flex-shrink-0" style={{ height: "38vh", background: COLORS.surface2 }}>
            {agent.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- agent-controlled Storage URL, not an optimizable static asset
              <img src={agent.photo_url} alt={agent.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl font-semibold" style={{ color: COLORS.inkSoft, fontFamily: "'Fraunces', serif" }}>
                {agent.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-8" style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-3xl text-center">
              {agent.name}
            </h1>
            {agent.brokerage && (
              <p className="text-sm mt-1 text-center" style={{ color: COLORS.inkSoft }}>
                {agent.brokerage}
              </p>
            )}
            {logoChip("w-32 h-14 mt-4")}

            <div className="w-full mt-6 pt-6 space-y-2.5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              {agent.phone && (
                <a href={`tel:${agent.phone}`} className="press flex items-center gap-3 px-4 py-3 text-sm font-medium" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.ink }}>
                  <Phone size={16} style={{ color: COLORS.accentBright }} />
                  {agent.phone}
                </a>
              )}
              {agent.phone && (
                <a href={`sms:${agent.phone}`} className="press flex items-center gap-3 px-4 py-3 text-sm font-medium" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.ink }}>
                  <MessageSquare size={16} style={{ color: COLORS.accentBright }} />
                  Text me
                </a>
              )}
              {agent.email && (
                <a href={`mailto:${agent.email}`} className="press flex items-center gap-3 px-4 py-3 text-sm font-medium" style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.ink }}>
                  <Mail size={16} style={{ color: COLORS.accentBright }} />
                  {agent.email}
                </a>
              )}
            </div>

            <button
              onClick={saveContact}
              className="press flex items-center justify-center gap-2 w-full mt-6 px-4 py-4 text-sm font-semibold uppercase tracking-wide"
              style={{ background: COLORS.accent, color: "#FBF3EF", borderRadius: 8, marginTop: "auto" }}
            >
              <Download size={16} />
              Save Contact
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Tablet/desktop: large horizontal card ---------- */}
      <div className="hidden md:flex flex-col items-center justify-center px-8" style={{ background: COLORS.bg, minHeight: "100vh" }}>
        <div className="mb-8">
          <BrandMark size="lg" ink={COLORS.ink} arc={COLORS.border} />
        </div>

        <div className="anim-popin flex w-full max-w-5xl" style={{ ...cardChrome, overflow: "hidden", minHeight: "26rem" }}>
          <div className="w-[42%] flex-shrink-0" style={{ background: COLORS.surface2, borderRight: `1px solid ${COLORS.border}` }}>
            {agent.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- agent-controlled Storage URL, not an optimizable static asset
              <img src={agent.photo_url} alt={agent.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl font-semibold" style={{ color: COLORS.inkSoft, fontFamily: "'Fraunces', serif" }}>
                {agent.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 p-12 flex flex-col justify-center">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }} className="text-5xl leading-tight truncate">
                  {agent.name}
                </h1>
                {agent.brokerage && (
                  <p className="text-lg mt-2 truncate" style={{ color: COLORS.inkSoft }}>
                    {agent.brokerage}
                  </p>
                )}
              </div>
              {logoChip("w-44 h-[4.6rem]")}
            </div>

            <div className="mt-8 pt-8 space-y-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              {agent.phone && (
                <a href={`tel:${agent.phone}`} className="press flex items-center gap-3 text-xl font-medium" style={{ color: COLORS.ink }}>
                  <Phone size={22} style={{ color: COLORS.accentBright, flexShrink: 0 }} />
                  <span className="truncate">{agent.phone}</span>
                </a>
              )}
              {agent.phone && (
                <a href={`sms:${agent.phone}`} className="press flex items-center gap-3 text-xl font-medium" style={{ color: COLORS.ink }}>
                  <MessageSquare size={22} style={{ color: COLORS.accentBright, flexShrink: 0 }} />
                  Text me
                </a>
              )}
              {agent.email && (
                <a href={`mailto:${agent.email}`} className="press flex items-center gap-3 text-xl font-medium" style={{ color: COLORS.ink }}>
                  <Mail size={22} style={{ color: COLORS.accentBright, flexShrink: 0 }} />
                  <span className="truncate">{agent.email}</span>
                </a>
              )}
            </div>

            <button
              onClick={saveContact}
              className="press flex items-center justify-center gap-2.5 mt-10 px-8 py-4 text-base font-semibold uppercase tracking-wide self-start"
              style={{ background: COLORS.accent, color: "#FBF3EF", borderRadius: 8 }}
            >
              <Download size={18} />
              Save Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
