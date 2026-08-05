"use client";

import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/types";

function priceBadgeLabel(l: Listing) {
  if (l.price == null) return l.agreement_type === "rental" ? "Rental" : "For sale";
  const short = l.price >= 1000 ? `$${Math.round(l.price / 1000)}k` : `$${l.price}`;
  return l.agreement_type === "rental" ? `${short}/mo` : short;
}

function priceIcon(L: typeof LeafletNS, l: Listing) {
  const label = priceBadgeLabel(l);
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="background:#E2543E;color:#fff;font-weight:800;font-size:12px;padding:4px 9px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid #fff;">${label}</div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #E2543E;margin-top:-1px;"></div>
      </div>`,
    iconSize: [52, 38],
    iconAnchor: [26, 38],
    popupAnchor: [0, -38],
  });
}

// Client-only: Leaflet touches `window`, so it's dynamically imported inside
// the effect rather than at module scope (which would break SSR).
export function ListingsMap({ listings, focusedListingId }: { listings: Listing[]; focusedListingId: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markersRef = useRef<Map<string, LeafletNS.Marker>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

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
      markersRef.current = new Map();

      const pts: [number, number][] = [];
      listings.forEach((l) => {
        if (l.lat == null || l.lng == null) return;
        const marker = L.marker([l.lat, l.lng], { icon: priceIcon(L, l) }).addTo(map);
        marker.bindPopup(`<strong>${l.address}</strong><br/>${l.agreement_type === "rental" ? "Rental" : "Sale"}`);
        markersRef.current.set(l.id, marker);
        pts.push([l.lat, l.lng]);
      });
      if (pts.length > 0) map.fitBounds(pts, { padding: [30, 30], maxZoom: 14 });
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [listings]);

  // Pan/zoom to whichever listing was clicked in the list below.
  useEffect(() => {
    if (!focusedListingId) return;
    const marker = markersRef.current.get(focusedListingId);
    const map = mapRef.current;
    if (!marker || !map) return;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.6 });
    marker.openPopup();
  }, [focusedListingId]);

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
