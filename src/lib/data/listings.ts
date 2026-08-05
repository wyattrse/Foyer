import type { SupabaseClient } from "@supabase/supabase-js";
import type { KioskListing, Listing } from "@/lib/types";

export async function fetchListings(supabase: SupabaseClient): Promise<Listing[]> {
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Listing[];
}

async function geocode(address: string): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
    if (!res.ok) return { lat: null, lng: null };
    return await res.json();
  } catch {
    return { lat: null, lng: null };
  }
}

export async function insertListing(
  supabase: SupabaseClient,
  agentId: string,
  form: { address: string; price: number | null; agreementType: Listing["agreement_type"] },
): Promise<Listing> {
  const { lat, lng } = await geocode(form.address);
  const { data, error } = await supabase
    .from("listings")
    .insert({ agent_id: agentId, address: form.address, price: form.price, agreement_type: form.agreementType, lat, lng })
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function updateListing(
  supabase: SupabaseClient,
  id: string,
  form: { address: string; price: number | null; agreementType: Listing["agreement_type"] },
): Promise<Listing> {
  const { lat, lng } = await geocode(form.address);
  const { data, error } = await supabase
    .from("listings")
    .update({ address: form.address, price: form.price, agreement_type: form.agreementType, lat, lng })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function deleteListing(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw error;
}

// Unauthenticated -- reads the narrow kiosk_listings view (anon-granted,
// bypasses the base `listings` table's agent-only RLS on purpose).
export async function fetchKioskListings(supabase: SupabaseClient, agentId: string): Promise<KioskListing[]> {
  const { data, error } = await supabase
    .from("kiosk_listings")
    .select("*")
    .eq("agent_id", agentId)
    .order("address", { ascending: true });
  if (error) throw error;
  return data as KioskListing[];
}
