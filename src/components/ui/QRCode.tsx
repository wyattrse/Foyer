"use client";

import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

// Real, scannable QR -- generated client-side so the kiosk page has no
// server round-trip on load. Keeps the same card chrome (padding, border,
// radius) the old fake placeholder had, so swapping it in is layout-neutral.
export function QRCode({
  value,
  size = 176,
  dark = "#1C1B17",
  light = "#FFFFFF",
}: {
  value: string;
  size?: number;
  dark?: string;
  light?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCodeLib.toDataURL(value, { width: size * 2, margin: 1, color: { dark, light } })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size, dark, light]);

  return (
    <div className="inline-flex items-center justify-center p-3" style={{ background: light, borderRadius: 8, border: "1px solid #E4DDC9", width: size + 24, height: size + 24 }}>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a generated data: URI, not an optimizable remote asset
        <img src={dataUrl} width={size} height={size} alt="QR code to save agent contact info" />
      ) : (
        <div style={{ width: size, height: size }} />
      )}
    </div>
  );
}
