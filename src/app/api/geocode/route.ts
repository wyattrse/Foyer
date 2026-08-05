import { NextRequest, NextResponse } from "next/server";

// Free geocoding via OpenStreetMap's Nominatim -- no API key. Runs server-side
// so we can set a proper User-Agent per Nominatim's usage policy.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ lat: null, lng: null });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "FoyerCRM/1.0 (solo real estate agent app)" } },
    );
    const results = await res.json();
    const first = results?.[0];
    if (!first) return NextResponse.json({ lat: null, lng: null });
    return NextResponse.json({ lat: parseFloat(first.lat), lng: parseFloat(first.lon) });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
