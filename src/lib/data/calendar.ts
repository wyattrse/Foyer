import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/lib/types";

export async function fetchEvents(supabase: SupabaseClient): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from("calendar_events").select("*").order("start_at", { ascending: true });
  if (error) throw error;
  return data as CalendarEvent[];
}

export async function insertEvent(
  supabase: SupabaseClient,
  agentId: string,
  form: { title: string; notes: string | null; startAt: string; endAt: string | null; leadId: string | null; listingId: string | null },
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      agent_id: agentId,
      title: form.title,
      notes: form.notes,
      start_at: form.startAt,
      end_at: form.endAt,
      lead_id: form.leadId,
      listing_id: form.listingId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CalendarEvent;
}

export async function updateEvent(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{ title: string; notes: string | null; startAt: string; endAt: string | null; leadId: string | null; listingId: string | null }>,
): Promise<CalendarEvent> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  if (patch.startAt !== undefined) dbPatch.start_at = patch.startAt;
  if (patch.endAt !== undefined) dbPatch.end_at = patch.endAt;
  if (patch.leadId !== undefined) dbPatch.lead_id = patch.leadId;
  if (patch.listingId !== undefined) dbPatch.listing_id = patch.listingId;
  const { data, error } = await supabase.from("calendar_events").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  return data as CalendarEvent;
}

export async function deleteEvent(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}
