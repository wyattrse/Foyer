import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileRecord } from "@/lib/types";

const BUCKET = "lead-files";

export async function fetchFiles(supabase: SupabaseClient): Promise<FileRecord[]> {
  const { data, error } = await supabase.from("files").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as FileRecord[];
}

export async function uploadFile(supabase: SupabaseClient, agentId: string, file: File, leadId: string | null): Promise<FileRecord> {
  const path = `${agentId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from("files")
    .insert({ agent_id: agentId, lead_id: leadId, name: file.name, storage_path: path, mime_type: file.type || null, size_bytes: file.size })
    .select()
    .single();
  if (error) throw error;
  return data as FileRecord;
}

export async function uploadBlobAsFile(
  supabase: SupabaseClient,
  agentId: string,
  blob: Blob,
  name: string,
  mimeType: string,
  leadId: string | null,
): Promise<FileRecord> {
  const path = `${agentId}/${crypto.randomUUID()}-${name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mimeType });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from("files")
    .insert({ agent_id: agentId, lead_id: leadId, name, storage_path: path, mime_type: mimeType, size_bytes: blob.size })
    .select()
    .single();
  if (error) throw error;
  return data as FileRecord;
}

export async function downloadFile(supabase: SupabaseClient, storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) throw error;
  return data;
}

export async function deleteFile(supabase: SupabaseClient, id: string, storagePath: string) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) throw error;
}

export async function attachFileToLead(supabase: SupabaseClient, id: string, leadId: string | null): Promise<FileRecord> {
  const { data, error } = await supabase.from("files").update({ lead_id: leadId }).eq("id", id).select().single();
  if (error) throw error;
  return data as FileRecord;
}

export async function renameFile(supabase: SupabaseClient, id: string, name: string): Promise<FileRecord> {
  const { data, error } = await supabase.from("files").update({ name }).eq("id", id).select().single();
  if (error) throw error;
  return data as FileRecord;
}
