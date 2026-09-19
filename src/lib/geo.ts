import type { GeoPoint } from "./types";

/** Default demo pin: SoMa, San Francisco (near Salesforce Tower). */
export const DEFAULT_LOCATION: GeoPoint = {
  lat: 37.7897,
  lng: -122.3972,
  label: "SoMa, San Francisco",
  at: new Date().toISOString(),
};

export function mapsUrl(p: GeoPoint): string {
  return `https://maps.google.com/?q=${p.lat},${p.lng}`;
}

export function formatLatLng(p: GeoPoint): string {
  return `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
}

export function lastLocationLabel(points: GeoPoint[]): string {
  if (points.length === 0) return "Unknown";
  const p = points[points.length - 1];
  const label = p.label ?? "Pinned location";
  return `${label} · ${formatLatLng(p)}`;
}
