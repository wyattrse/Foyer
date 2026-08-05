import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/lib/types";

export async function fetchTasks(supabase: SupabaseClient): Promise<Task[]> {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Task[];
}

export async function insertTask(supabase: SupabaseClient, agentId: string, text: string): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ agent_id: agentId, text })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function setTaskDone(supabase: SupabaseClient, id: string, done: boolean) {
  const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
