import type { Incident, Observation } from "./types";
import type { ClassifyResult } from "./adapters/llm";

export const URGENCY_RANK: Record<Incident["urgency"], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
}

/**
 * Resolve who an observation is about to a person id.
 * - aboutPersonId matching an existing id or name wins.
 * - aboutRole ("user" | "aggressor") links to that role, creating an
 *   "Unknown adult male" aggressor placeholder if needed so perpetrator
 *   clothing is never silently dropped or misattributed to the victim.
 * - Unresolvable raw strings are preserved (never invent, never drop).
 */
function resolveAbout(
  incident: Incident,
  o: { aboutPersonId?: string; aboutRole?: string }
): string | undefined {
  if (o.aboutPersonId) {
    const q = o.aboutPersonId.toLowerCase();
    const hit = incident.people.find((p) => p.id === o.aboutPersonId || p.name.toLowerCase() === q);
    if (hit) return hit.id;
    return o.aboutPersonId;
  }
  if (o.aboutRole === "user" || o.aboutRole === "aggressor") {
    const hit = incident.people.find((p) => p.role === o.aboutRole);
    if (hit) return hit.id;
    if (o.aboutRole === "aggressor") {
      const placeholder = {
        id: uid("p"),
        name: "Unknown adult male",
        role: "aggressor" as const,
        notes: "Linked from an observation; identity unknown.",
      };
      incident.people.push(placeholder);
      return placeholder.id;
    }
    if (incident.user) {
      const self = incident.people.find((p) => p.id === incident.user.id);
      if (self) return self.id;
    }
  }
  return undefined;
}

export interface MergeOutcome {
  addedObservations: number;
  addedPeople: number;
  prevUrgency: Incident["urgency"];
}

/** Shared merge for message / image / live-frame routes: people first, then observations. */
export function mergeClassifyResult(
  incident: Incident,
  result: ClassifyResult,
  now = new Date().toISOString()
): MergeOutcome {
  const prevUrgency = incident.urgency;
  incident.type = result.type;
  incident.urgency = result.urgency;
  incident.speakFreely = result.speakFreely;
  incident.summary = result.summary || incident.summary;

  let addedPeople = 0;
  for (const p of result.people) {
    if (!p.name) continue;
    const exists = incident.people.some((x) => x.name === p.name && (p.role ? x.role === p.role : true));
    if (!exists) {
      incident.people.push({
        id: uid("p"),
        name: p.name,
        role: p.role ?? "witness",
        phone: p.phone,
        notes: p.notes ?? "Extracted from chat; verify.",
      });
      addedPeople++;
    }
  }

  const seen = new Set(incident.observations.map((o) => `${o.kind}::${normalize(o.text)}`));
  let addedObservations = 0;
  for (const o of result.observations) {
    const key = `${o.kind}::${normalize(o.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { aboutRole: _aboutRole, ...rest } = o;
    const full: Observation = {
      ...rest,
      aboutPersonId: resolveAbout(incident, o) ?? rest.aboutPersonId,
      id: uid("o"),
      at: now,
    };
    incident.observations.push(full);
    addedObservations++;
  }
  return { addedObservations, addedPeople, prevUrgency };
}
