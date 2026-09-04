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
  patch: {
    name?: string;
    brokerage?: string;
    commission_split?: number;
    phone?: string | null;
    email?: string | null;
    photo_url?: string | null;
    logo_url?: string | null;
  },
): Promise<Agent> {
  const { data, error } = await supabase.from("agents").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Agent;
}

const PUBLIC_ASSETS_BUCKET = "agent-public";

// Fixed filenames ("<agent_id>/photo", "<agent_id>/logo") so re-uploading
// replaces the old image at the same public URL instead of accumulating
// orphaned files -- upsert:true overwrites in place.
export async function uploadAgentAsset(supabase: SupabaseClient, agentId: string, kind: "photo" | "logo", file: File): Promise<string> {
  const path = `${agentId}/${kind}`;
  const { error: uploadError } = await supabase.storage.from(PUBLIC_ASSETS_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(path);
  // Cache-bust so the new image shows immediately instead of a stale
  // browser/CDN-cached copy at the same URL.
  return `${data.publicUrl}?t=${Date.now()}`;
}
