import type { SupabaseClient } from "@supabase/supabase-js";
import type { Template } from "@/lib/types";

export async function fetchTemplates(supabase: SupabaseClient): Promise<Template[]> {
  // RLS already restricts this to the agent's own templates + shared (agent_id
  // is null) ones, so no explicit filter is needed here.
  const { data, error } = await supabase.from("templates").select("*");
  if (error) throw error;
  return data as Template[];
}

export async function insertTemplate(
  supabase: SupabaseClient,
  agentId: string,
  form: { title: string; body: string },
): Promise<Template> {
  const { data, error } = await supabase
    .from("templates")
    .insert({ agent_id: agentId, title: form.title, body: form.body })
    .select()
    .single();
  if (error) throw error;
  return data as Template;
}

export async function updateTemplate(
  supabase: SupabaseClient,
  id: string,
  form: { title: string; body: string },
) {
  const { error } = await supabase.from("templates").update(form).eq("id", id);
  if (error) throw error;
}

export async function deleteTemplate(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw error;
}
