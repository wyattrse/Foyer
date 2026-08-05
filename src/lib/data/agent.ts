import type { SupabaseClient } from "@supabase/supabase-js";
import type { Agent } from "@/lib/types";

export async function fetchAgent(supabase: SupabaseClient, id: string): Promise<Agent> {
  const { data, error } = await supabase.from("agents").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Agent;
}

export async function updateAgent(
  supabase: SupabaseClient,
  id: string,
  patch: { name?: string; brokerage?: string; commission_split?: number },
): Promise<Agent> {
  const { data, error } = await supabase.from("agents").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Agent;
}
