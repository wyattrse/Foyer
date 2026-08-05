"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import { CARD_SM, COLORS } from "@/lib/theme";

export interface Toast {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback(
    ({
      message,
      actionLabel,
      onAction,
      duration = 4000,
    }: {
      message: string;
      actionLabel?: string;
      onAction?: () => void;
      duration?: number;
    }) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, actionLabel, onAction }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, pushToast, dismissToast };
}

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 items-end" style={{ maxWidth: "90vw" }}>
      {toasts.map((t) => (
        <div key={t.id} className="anim-fadeup mark flex items-center gap-3 px-4 py-3" style={{ ...CARD_SM, animationDelay: "0ms" }}>
          <span className="text-sm" style={{ color: COLORS.ink }}>{t.message}</span>
          {t.actionLabel && (
            <button
              onClick={() => {
                t.onAction?.();
                onDismiss(t.id);
              }}
              className="text-xs font-medium uppercase tracking-wide flex-shrink-0"
              style={{ color: COLORS.accentBright }}
            >
              {t.actionLabel}
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} style={{ color: COLORS.inkSoft }} className="flex-shrink-0">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
