"use client";

import { useRef, useState } from "react";
import { COLORS } from "@/lib/theme";
import { PrimaryButton } from "@/components/ui/Basics";

const VIEWPORT_WIDTH = 320;
// Output is rendered at a higher resolution than the on-screen crop
// viewport so the saved photo/logo isn't blurry on a retina display.
const OUTPUT_SCALE = 2.5;

// Drag-to-pan, slider-to-zoom crop tool used for both the profile photo
// (circle, 1:1) and brokerage logo (wide rect) uploads in Settings -- lets
// the agent pick the framing themselves instead of getting whatever crop
// object-cover/object-contain happens to produce from the raw upload.
export function ImageCropModal({
  file,
  aspect,
  shape,
  title,
  onCancel,
  onConfirm,
}: {
  file: File;
  aspect: number;
  shape: "circle" | "rect";
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const viewportHeight = Math.round(VIEWPORT_WIDTH / aspect);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Lazy-initialized so the blob URL is created exactly once for the file's
  // lifetime, and revoked explicitly on cancel/confirm below -- tying the
  // revoke to an effect cleanup instead breaks the image immediately under
  // React Strict Mode's dev-only double-invoke of effects.
  const [src] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const baseScale = natural ? Math.max(VIEWPORT_WIDTH / natural.w, viewportHeight / natural.h) : 1;
  const scale = baseScale * zoom;
  const dw = natural ? natural.w * scale : 0;
  const dh = natural ? natural.h * scale : 0;

  // The image must always fully cover the viewport, so offsets are clamped
  // to [viewport - imageSize, 0] on each axis.
  const clamp = (x: number, y: number) => ({
    x: Math.min(0, Math.max(VIEWPORT_WIDTH - dw, x)),
    y: Math.min(0, Math.max(viewportHeight - dh, y)),
  });

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    const bs = Math.max(VIEWPORT_WIDTH / w, viewportHeight / h);
    setPos({ x: (VIEWPORT_WIDTH - w * bs) / 2, y: (viewportHeight - h * bs) / 2 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clamp(dragRef.current.origX + dx, dragRef.current.origY + dy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Zoom anchored on the viewport center -- keep whatever image point is
  // currently centered still centered after the scale changes, rather than
  // growing/shrinking from the image's top-left corner.
  const handleZoom = (z: number) => {
    if (!natural) {
      setZoom(z);
      return;
    }
    const cx = VIEWPORT_WIDTH / 2;
    const cy = viewportHeight / 2;
    const ix = (cx - pos.x) / scale;
    const iy = (cy - pos.y) / scale;
    const newScale = baseScale * z;
    setZoom(z);
    setPos(clamp(cx - ix * newScale, cy - iy * newScale));
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !natural) return;
    const outW = Math.round(VIEWPORT_WIDTH * OUTPUT_SCALE);
    const outH = Math.round(viewportHeight * OUTPUT_SCALE);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const outScale = scale * OUTPUT_SCALE;
    ctx.drawImage(img, pos.x * OUTPUT_SCALE, pos.y * OUTPUT_SCALE, natural.w * outScale, natural.h * outScale);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(src);
      if (blob) onConfirm(blob);
    }, "image/png");
  };

  const handleCancel = () => {
    URL.revokeObjectURL(src);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-sm p-5" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
        <p className="text-sm font-semibold mb-3" style={{ color: COLORS.ink }}>
          {title}
        </p>

        <div
          className="relative mx-auto touch-none select-none"
          style={{
            width: VIEWPORT_WIDTH,
            height: viewportHeight,
            overflow: "hidden",
            borderRadius: shape === "circle" ? "50%" : 8,
            background: COLORS.surface2,
            cursor: "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- drawn to a canvas on confirm, not an optimizable static asset */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={handleImgLoad}
            draggable={false}
            style={{ position: "absolute", left: pos.x, top: pos.y, width: dw, height: dh, maxWidth: "none" }}
          />
        </div>

        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => handleZoom(Number(e.target.value))} className="w-full mt-4" />
        <p className="text-xs text-center mt-1" style={{ color: COLORS.inkSoft }}>
          Drag to reposition, slide to zoom
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCancel}
            className="press flex-1 px-4 py-2.5 text-xs font-medium uppercase tracking-wide"
            style={{ background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.inkSoft }}
          >
            Cancel
          </button>
          <PrimaryButton onClick={handleConfirm} className="flex-1 px-4">
            Save
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
