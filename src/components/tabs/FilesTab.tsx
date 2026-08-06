"use client";

import { useRef, useState } from "react";
import { Download, File as FileIcon, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { CARD_SM, COLORS, alpha, inputStyle } from "@/lib/theme";
import { TemplatesTab } from "@/components/tabs/TemplatesTab";
import { canConvertToPdf } from "@/lib/pdfConvert";
import type { FileRecord, LeadWithStatus, Template } from "@/lib/types";

function formatSize(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesTab({
  files,
  leads,
  templates,
  highlightedFileId,
  onUpload,
  onDownload,
  onDelete,
  onAttachToLead,
  onConvertToPdf,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}: {
  files: FileRecord[];
  leads: LeadWithStatus[];
  templates: Template[];
  highlightedFileId?: string | null;
  onUpload: (file: File, leadId: string | null) => Promise<void>;
  onDownload: (file: FileRecord) => Promise<void>;
  onDelete: (id: string) => void;
  onAttachToLead: (id: string, leadId: string | null) => void;
  onConvertToPdf: (file: FileRecord) => Promise<void>;
  onAddTemplate: (form: { title: string; body: string }) => void;
  onUpdateTemplate: (id: string, form: { title: string; body: string }) => void;
  onDeleteTemplate: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file, null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleConvert = async (file: FileRecord) => {
    setConvertingId(file.id);
    try {
      await onConvertToPdf(file);
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>
            Documents
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="press flex items-center gap-1.5 text-sm font-medium disabled:opacity-50"
            style={{ color: COLORS.accentBright }}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload file
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={handleFilePick} />
        </div>

        <p className="text-xs mb-4" style={{ color: COLORS.inkSoft }}>
          Contracts, disclosures, and anything else you need on hand. Attach a file to a lead so it shows up on their record. PDF conversion currently
          works for images and plain text files — other formats (Word, Excel) download as-is.
        </p>

        <div className="space-y-2">
          {files.length === 0 && (
            <p className="text-sm italic" style={{ color: COLORS.inkSoft }}>
              No files yet.
            </p>
          )}
          {files.map((f, idx) => {
            const attachedLead = leads.find((l) => l.id === f.lead_id);
            const convertible = canConvertToPdf(f.mime_type, f.name);
            return (
              <div
                key={f.id}
                className={`mark anim-fadeup p-3.5 ${f.id === highlightedFileId ? "ai-glow" : ""}`}
                style={{ ...CARD_SM, animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileIcon size={15} style={{ color: COLORS.inkSoft, marginTop: 2, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>
                        {f.name}
                      </p>
                      <p className="text-xs" style={{ color: COLORS.inkSoft }}>
                        {formatSize(f.size_bytes)}
                        {attachedLead ? ` · attached to ${attachedLead.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    {convertible && (
                      <button
                        onClick={() => handleConvert(f)}
                        disabled={convertingId === f.id}
                        title="Convert to PDF"
                        style={{ color: COLORS.ai }}
                      >
                        {convertingId === f.id ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                      </button>
                    )}
                    <button onClick={() => onDownload(f)} title="Download" style={{ color: COLORS.inkSoft }}>
                      <Download size={14} />
                    </button>
                    <button onClick={() => onDelete(f.id)} title="Delete" style={{ color: COLORS.accentBright }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Paperclip size={11} style={{ color: COLORS.inkSoft, flexShrink: 0 }} />
                  <select
                    value={f.lead_id ?? ""}
                    onChange={(e) => onAttachToLead(f.id, e.target.value || null)}
                    className="text-xs px-2 py-1 outline-none"
                    style={{ ...inputStyle, background: alpha(COLORS.border, 30) }}
                  >
                    <option value="">Not attached to a lead</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLORS.inkSoft }}>
          Message templates
        </p>
        <TemplatesTab templates={templates} onAdd={onAddTemplate} onUpdate={onUpdateTemplate} onDelete={onDeleteTemplate} />
      </div>
    </div>
  );
}
