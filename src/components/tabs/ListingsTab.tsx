"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, MapPin } from "lucide-react";
import { CARD_SM, COLORS, inputStyle } from "@/lib/theme";
import { PrimaryButton, Pill, FieldLabel } from "@/components/ui/Basics";
import { ListingsMap } from "@/components/listings/ListingsMap";
import type { AgreementType, LeadWithStatus, Listing } from "@/lib/types";

const AGREEMENT_FILTERS = [
  { key: "all", label: "All" },
  { key: "sale", label: "Sale" },
  { key: "rental", label: "Rental" },
] as const;

interface ListingForm {
  address: string;
  price: string;
  agreementType: AgreementType;
}

const EMPTY_FORM: ListingForm = { address: "", price: "", agreementType: "sale" };

function priceLabel(agreementType: AgreementType) {
  return agreementType === "rental" ? "Monthly rent" : "Listing price";
}

function formatPrice(price: number | null, agreementType: AgreementType) {
  if (price == null) return "No price set";
  const amount = `$${Number(price).toLocaleString()}`;
  return agreementType === "rental" ? `${amount}/mo` : amount;
}

export function ListingsTab({
  listings,
  leads,
  onAdd,
  onUpdate,
  onDelete,
  onSelectLead,
}: {
  listings: Listing[];
  leads: LeadWithStatus[];
  onAdd: (form: { address: string; price: number | null; agreementType: AgreementType }) => void;
  onUpdate: (id: string, form: { address: string; price: number | null; agreementType: AgreementType }) => void;
  onDelete: (id: string) => void;
  onSelectLead: (lead: LeadWithStatus) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<ListingForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ListingForm>(EMPTY_FORM);
  const [agreementFilter, setAgreementFilter] = useState<"all" | AgreementType>("all");
  const [focusedListingId, setFocusedListingId] = useState<string | null>(null);

  const filteredListings = useMemo(
    () => (agreementFilter === "all" ? listings : listings.filter((l) => l.agreement_type === agreementFilter)),
    [listings, agreementFilter],
  );

  const toPatch = (f: ListingForm) => ({
    address: f.address.trim(),
    price: f.price === "" ? null : Number(f.price),
    agreementType: f.agreementType,
  });

  const submitNew = () => {
    if (!form.address.trim()) return;
    onAdd(toPatch(form));
    setForm(EMPTY_FORM);
    setAdding(false);
  };
  const startEdit = (l: Listing) => {
    setEditingId(l.id);
    setEditForm({ address: l.address, price: l.price != null ? String(l.price) : "", agreementType: l.agreement_type });
  };
  const saveEdit = (id: string) => {
    if (!editForm.address.trim()) return;
    onUpdate(id, toPatch(editForm));
    setEditingId(null);
  };

  return (
    <div className="max-w-xl">
      <ListingsMap listings={filteredListings} focusedListingId={focusedListingId} />

      <div className="flex gap-1.5 mb-4">
        {AGREEMENT_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setAgreementFilter(f.key)}
            className="press px-3 py-1.5 text-xs font-medium uppercase tracking-wide"
            style={{
              color: agreementFilter === f.key ? "#FBF3EF" : COLORS.inkSoft,
              background: agreementFilter === f.key ? COLORS.accent : COLORS.surface2,
              border: `1px solid ${agreementFilter === f.key ? COLORS.accent : COLORS.border}`,
              borderRadius: 5,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-4">
        {filteredListings.map((l, idx) => {
          const associatedLeads = leads.filter((lead) => lead.listing_id === l.id);
          return (
            <div key={l.id} className="mark anim-fadeup p-4" style={{ ...CARD_SM, animationDelay: `${idx * 40}ms` }}>
              {editingId === l.id ? (
                <div className="space-y-2">
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full px-3 py-2 text-sm outline-none font-medium"
                    style={inputStyle}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder={priceLabel(editForm.agreementType)}
                      className="w-full px-3 py-2 text-sm outline-none"
                      style={inputStyle}
                    />
                    <select
                      value={editForm.agreementType}
                      onChange={(e) => setEditForm((f) => ({ ...f, agreementType: e.target.value as AgreementType }))}
                      className="w-full px-3 py-2 text-sm outline-none"
                      style={inputStyle}
                    >
                      <option value="sale">Sale</option>
                      <option value="rental">Rental</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <PrimaryButton onClick={() => saveEdit(l.id)} className="px-3 py-1.5 text-xs">
                      Save
                    </PrimaryButton>
                    <button onClick={() => setEditingId(null)} className="text-xs" style={{ color: COLORS.inkSoft }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-1">
                    <button
                      onClick={() => setFocusedListingId(l.id)}
                      className="flex items-start gap-2 min-w-0 text-left press"
                      title="Show on map"
                    >
                      <MapPin size={14} style={{ color: COLORS.accentBright, marginTop: 2, flexShrink: 0 }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>
                          {l.address}
                        </p>
                        <p className="text-xs" style={{ color: COLORS.inkSoft }}>
                          {formatPrice(l.price, l.agreement_type)}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Pill color={l.agreement_type === "rental" ? COLORS.warm : COLORS.cold}>{l.agreement_type}</Pill>
                      <button onClick={() => startEdit(l)} style={{ color: COLORS.inkSoft }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(l.id)} style={{ color: COLORS.accentBright }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <p className="text-xs uppercase tracking-wide mb-1" style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>
                      {associatedLeads.length} lead{associatedLeads.length === 1 ? "" : "s"}
                    </p>
                    {associatedLeads.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {associatedLeads.map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => onSelectLead(lead)}
                            className="press px-2 py-1 text-xs"
                            style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.ink }}
                          >
                            {lead.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {filteredListings.length === 0 && listings.length > 0 && (
          <p className="text-sm italic" style={{ color: COLORS.inkSoft }}>
            No {agreementFilter} listings.
          </p>
        )}
        {listings.length === 0 && (
          <p className="text-sm italic" style={{ color: COLORS.inkSoft }}>
            No listings yet — add the property you&apos;re holding an open house for, and it&apos;ll show up as an option on your kiosk sign-in.
          </p>
        )}
      </div>
      {adding ? (
        <div className="p-4 space-y-2" style={CARD_SM}>
          <div>
            <FieldLabel>Address</FieldLabel>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="123 Main St, Austin, TX"
              className="w-full px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>{priceLabel(form.agreementType)}</FieldLabel>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Agreement type</FieldLabel>
              <select
                value={form.agreementType}
                onChange={(e) => setForm((f) => ({ ...f, agreementType: e.target.value as AgreementType }))}
                className="w-full px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="sale">Sale</option>
                <option value="rental">Rental</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={submitNew} className="px-3 py-1.5 text-xs">
              Add listing
            </PrimaryButton>
            <button onClick={() => setAdding(false)} className="text-xs" style={{ color: COLORS.inkSoft }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="press flex items-center gap-1.5 text-sm font-medium" style={{ color: COLORS.accentBright }}>
          <Plus size={14} /> New listing
        </button>
      )}
    </div>
  );
}
