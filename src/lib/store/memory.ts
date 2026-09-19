import type { Incident, OutboundNotice } from "../types";

// Store module state on globalThis so it survives Next.js dev-mode module
// re-evaluation (lazily compiled routes re-execute this module, which would
// otherwise wipe the in-memory demo store mid-demo).
const g = globalThis as unknown as {
  __havenIncidents?: Map<string, Incident>;
  __havenOutbox?: OutboundNotice[];
};

if (!g.__havenIncidents) g.__havenIncidents = new Map<string, Incident>();
if (!g.__havenOutbox) g.__havenOutbox = [];

const incidents: Map<string, Incident> = g.__havenIncidents;
const outbox: OutboundNotice[] = g.__havenOutbox;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const memoryStore = {
  uid,
  save(incident: Incident): void {
    incidents.set(incident.id, incident);
  },
  get(id: string): Incident | undefined {
    return incidents.get(id);
  },
  list(): Incident[] {
    return [...incidents.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },
  clear(): void {
    incidents.clear();
    outbox.length = 0;
  },
  active(): Incident | undefined {
    const actives = [...incidents.values()].filter((i) => i.status === "active");
    actives.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return actives[0];
  },
  pushOutbox(n: OutboundNotice): void {
    outbox.unshift(n);
  },
  getOutbox(): OutboundNotice[] {
    return [...outbox];
  },
  clearOutbox(): void {
    outbox.length = 0;
  },
};
