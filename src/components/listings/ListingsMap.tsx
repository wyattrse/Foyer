"use client";

import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/types";

// Client-only: Leaflet touches `window`, so it's dynamically imported inside
// the effect rather than at module scope (which would break SSR).
export function ListingsMap({ listings }: { listings: Listing[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markersRef = useRef<LeafletNS.Marker[]>([]);

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      // Next.js/webpack doesn't resolve Leaflet's default marker icon image
      // paths correctly (they 404), so point them at the CDN copies instead.
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView([31.9686, -99.9018], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapRef.current);
        ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
        ro.observe(containerRef.current);
      }
      const map = mapRef.current;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const pts: [number, number][] = [];
      listings.forEach((l) => {
        if (l.lat == null || l.lng == null) return;
        const marker = L.marker([l.lat, l.lng]).addTo(map);
        const priceStr = l.price != null ? ` &middot; $${Number(l.price).toLocaleString()}${l.agreement_type === "rental" ? "/mo" : ""}` : "";
        marker.bindPopup(`<strong>${l.address}</strong><br/>${l.agreement_type === "rental" ? "Rental" : "Sale"}${priceStr}`);
        markersRef.current.push(marker);
        pts.push([l.lat, l.lng]);
      });
      if (pts.length > 0) map.fitBounds(pts, { padding: [30, 30], maxZoom: 14 });
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [listings]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="w-full mb-4 sticky z-10"
      style={{
        top: 64,
        height: 320,
        minHeight: 200,
        maxHeight: 600,
        resize: "vertical",
        overflow: "hidden",
        borderRadius: 8,
        border: "1px solid #38342A",
      }}
    />
  );
}
