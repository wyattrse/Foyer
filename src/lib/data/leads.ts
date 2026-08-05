import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead, LeadFormValues, LeadWithStatus } from "@/lib/types";
import { applyFormToLeadPatch } from "@/lib/scoring";

export async function fetchLeads(supabase: SupabaseClient): Promise<LeadWithStatus[]> {
  const { data, error } = await supabase
    .from("leads_with_status")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as LeadWithStatus[];
}

export async function insertLead(
  supabase: SupabaseClient,
  agentId: string,
  form: LeadFormValues,
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert({ agent_id: agentId, ...applyFormToLeadPatch(form) })
    .select()
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLead(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<Lead> {
  const { data, error } = await supabase.from("leads").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function softDeleteLead(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function undoDeleteLead(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("leads").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function persistReorderPatches(
  supabase: SupabaseClient,
  patches: { id: string; sort_order: number; stage?: string; source?: string }[],
) {
  await Promise.all(
    patches.map(({ id, ...patch }) => supabase.from("leads").update(patch).eq("id", id)),
  );
}
