"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchKioskListings } from "@/lib/data/listings";
import { GlobalStyle } from "@/components/ui/GlobalStyle";
import { BrandMark } from "@/components/ui/BrandMark";
import { QRPlaceholder } from "@/components/ui/QRPlaceholder";
import { LeadForm } from "@/components/leads/LeadForm";
import { COLORS, KIOSK, inputStyle } from "@/lib/theme";
import type { KioskListing, LeadFormValues } from "@/lib/types";

// Genuinely unauthenticated route -- no session, no read access to anything.
// Insert is only permitted by the "kiosk insert-only new leads" RLS policy
// (anon role, insert-only, zero read access -- see spec §5). The listing
// dropdown reads from the kiosk_listings view, which deliberately bypasses
// the agent-only `listings` table RLS to expose just id/address/type.
export default function KioskPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const supabase = useMemo(() => createClient(), []);
  const [thanks, setThanks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<KioskListing[]>([]);
  const [listingId, setListingId] = useState<string>("");

  useEffect(() => {
    fetchKioskListings(supabase, agentId)
      .then((data) => {
        setListings(data);
        if (data.length === 1) setListingId(data[0].id);
      })
      .catch(() => {
        // Non-fatal -- the sign-in form still works without a listing selected.
      });
  }, [supabase, agentId]);

  const kCard = {
    background: KIOSK.surface,
    borderRadius: 8,
    border: `1px solid ${KIOSK.border}`,
    boxShadow: "0 10px 28px rgba(28,27,23,0.08)",
  };

  const handleSubmit = async (form: LeadFormValues) => {
    setError(null);
    const { error } = await supabase.from("leads").insert({
      agent_id: agentId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      source: "Open House",
      timeline: form.timeline,
      has_agent: form.hasAgent,
      notes: form.notes.trim() || null,
      listing_id: listingId || null,
    });
    if (error) {
      setError("Couldn't submit — please ask a staff member for help.");
      return;
    }
    setThanks(true);
    setTimeout(() => setThanks(false), 2600);
  };

  return (
    <div className="anim-fadein" style={{ background: KIOSK.bg, minHeight: "100vh", fontFamily: "'Space Grotesk', sans-serif" }}>
      <GlobalStyle />
      <div className="flex items-center justify-between px-6 py-4" style={{ background: KIOSK.surface, borderBottom: `1px solid ${KIOSK.border}` }}>
        <BrandMark size="sm" ink={KIOSK.ink} arc={KIOSK.border} />
        <Link
          href="/dashboard"
          aria-label="Exit Open House mode"
          title="Exit Open House mode"
          className="press w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: KIOSK.bg, border: `1px solid ${KIOSK.border}`, color: KIOSK.soft }}
        >
          <X size={18} />
        </Link>
      </div>
      <div className="max-w-md mx-auto pt-10 px-6 pb-12">
        {!thanks && (
          <div className="text-center mb-6">
            <h1 style={{ fontFamily: "'Fraunces', serif", color: KIOSK.ink }} className="text-2xl">
              Welcome — sign in
            </h1>
            <p className="text-xs mt-1 uppercase tracking-wide" style={{ color: KIOSK.soft }}>
              Just a few details so we can follow up.
            </p>
          </div>
        )}

        {!thanks && listings.length > 1 && (
          <div className="mb-6">
            <label className="block text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: KIOSK.soft, fontSize: 10.5 }}>
              Which property is this?
            </label>
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm outline-none"
              style={{ ...inputStyle, background: KIOSK.input, border: `1px solid ${KIOSK.border}`, color: KIOSK.ink }}
            >
              <option value="">Select a property...</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.address}
                </option>
              ))}
            </select>
          </div>
        )}

        {!thanks && (
          <div className="flex flex-col items-center mb-6 p-5" style={kCard}>
            <QRPlaceholder light={KIOSK.surface} dark={KIOSK.ink} />
            <p className="text-xs mt-3 text-center" style={{ color: KIOSK.ink }}>
              Scan to save my contact card
            </p>
            <p className="text-[10px] mt-1 uppercase tracking-wide" style={{ color: COLORS.accent }}>
              Placeholder — swap in your real QR
            </p>
          </div>
        )}

        {thanks ? (
          <div className="anim-popin flex flex-col items-center text-center p-10" style={kCard}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: COLORS.accent + "18" }}>
              <Check size={22} style={{ color: COLORS.accent }} />
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", color: KIOSK.ink }} className="text-xl mb-1">
              Thanks — you&apos;re all set!
            </h2>
            <p className="text-sm" style={{ color: KIOSK.soft }}>
              We&apos;ll be in touch soon.
            </p>
          </div>
        ) : (
          <div className="p-6" style={kCard}>
            <LeadForm mode="capture" onSubmit={handleSubmit} light />
          </div>
        )}

        {error && (
          <div className="mt-4 text-xs px-3 py-2 text-center" style={{ background: COLORS.accent + "18", color: COLORS.accent, borderRadius: 5 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
