import type { SupabaseClient } from "@supabase/supabase-js";
import type { Interaction } from "@/lib/types";

export async function fetchInteractions(supabase: SupabaseClient, leadId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Interaction[];
}

export async function logInteraction(supabase: SupabaseClient, leadId: string, text: string): Promise<Interaction> {
  const { data, error } = await supabase
    .from("interactions")
    .insert({ lead_id: leadId, text })
    .select()
    .single();
  if (error) throw error;
  return data as Interaction;
}
