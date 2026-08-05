import { NextRequest, NextResponse } from "next/server";

// US Census Bureau geocoder -- free, no API key, built on official TIGER/MAF
// address data. Covers US addresses (including TX subdivisions) far more
// completely than OpenStreetMap/Nominatim's volunteer-contributed data.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ lat: null, lng: null });

  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`,
    );
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];
    if (!match) return NextResponse.json({ lat: null, lng: null });
    return NextResponse.json({ lat: match.coordinates.y, lng: match.coordinates.x });
  } catch {
    return NextResponse.json({ lat: null, lng: null });
  }
}
