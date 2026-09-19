import type { Incident } from "./types";
import { lastLocationLabel } from "./geo";

function obsOf(incident: Incident, kind: string): string[] {
  return incident.observations.filter((o) => o.kind === kind).map((o) => o.text);
}

/** Clothing/injury lines annotated with who they describe (perpetrator vs user). */
function attributedObs(incident: Incident, kind: string): string[] {
  return incident.observations
    .filter((o) => o.kind === kind)
    .map((o) => {
      const p = incident.people.find((x) => x.id === o.aboutPersonId || x.name === o.aboutPersonId);
      if (!p) return o.text;
      if (p.role === "aggressor") return `${o.text} (perpetrator: ${p.name})`;
      if (p.role === "user") return `${o.text} (user)`;
      return `${o.text} (${p.name})`;
    });
}

function firstOrUnknown(list: string[]): string {
  return list.length > 0 ? list.join("; ") : "Unknown";
}

/** Deterministic 15-second packet — never invents evidence. */
export function formatBriefPacket(incident: Incident): {
  who: string;
  whereLast: string;
  injuries: string;
  clothing: string;
  notified: string;
  unknowns: string[];
} {
  const who = incident.user?.name ?? "Unknown";
  const whereLast = lastLocationLabel(incident.locations);
  const injuries = firstOrUnknown(attributedObs(incident, "injury"));
  const clothing = firstOrUnknown(attributedObs(incident, "clothing"));
  const notified =
    incident.notices.length > 0
      ? incident.notices.map((n) => `${n.toName} (${n.status})`).join(", ")
      : "Nobody notified yet";
  const unknowns: string[] = [];
  if (obsOf(incident, "injury").length === 0) unknowns.push("Injuries: unknown");
  if (obsOf(incident, "clothing").length === 0) unknowns.push("Clothing: unknown");
  if (incident.locations.length === 0) unknowns.push("Location: unknown");
  const aggressor = incident.people.find((p) => p.role === "aggressor");
  if (!aggressor || aggressor.name === "Unknown adult male" || !aggressor.notes) {
    unknowns.push("Other person details: unknown");
  }
  return { who, whereLast, injuries, clothing, notified, unknowns };
}

export function elapsedSince(iso: string, now = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}
