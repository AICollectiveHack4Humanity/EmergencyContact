import type { Incident } from "../types";
import { memoryStore } from "../store/memory";
import { SEED_RESOURCES, type SeedResource } from "@/data/seed-resources";

export interface Briefing {
  incident: Incident;
  cypherPreview: string;
  relatedResourceNames: string[];
  fallback?: boolean;
}

export interface GraphAdapter {
  readonly mode: "live" | "mock";
  upsertIncident(incident: Incident): Promise<void>;
  getBriefing(incidentId: string): Promise<Briefing>;
  searchResources(
    kind: "hotline" | "shelter" | "hospital" | "pd",
    city?: string
  ): Promise<{ name: string; phone: string; kind: string }[]>;
}

export function cypherForBriefing(incidentId: string): string {
  return [
    `// Haven case-graph query for case "${incidentId}"`,
    `MATCH (i:Incident {id: $id})`,
    `OPTIONAL MATCH (u:Person)-[:SUBJECT_OF]->(i)`,
    `OPTIONAL MATCH (p:Person)-[:INVOLVED_IN]->(i)`,
    `OPTIONAL MATCH (i)-[:HAS]->(o:Observation)`,
    `OPTIONAL MATCH (i)-[:OCCURRED_AT]->(loc:Location)`,
    `OPTIONAL MATCH (i)-[:NOTIFIED]->(c:Person)`,
    `OPTIONAL MATCH (i)-[:USED_RESOURCE]->(r:Resource)`,
    `RETURN i, u, collect(distinct p), collect(distinct o), collect(distinct loc), collect(distinct c), collect(distinct r)`,
  ].join("\n");
}

// Local case store (module-level Map). The former FalkorDB integration was
// removed; the briefing page still shows the case query for transparency.
export const mockGraph: GraphAdapter = {
  mode: "mock",
  async upsertIncident(incident: Incident): Promise<void> {
    memoryStore.save(incident);
  },
  async getBriefing(incidentId: string): Promise<Briefing> {
    const incident = memoryStore.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found.`);
    return {
      incident,
      cypherPreview: cypherForBriefing(incidentId),
      relatedResourceNames: incident.resourcesUsed.length > 0 ? incident.resourcesUsed : ["National Domestic Violence Hotline"],
    };
  },
  async searchResources(kind, city): Promise<{ name: string; phone: string; kind: string }[]> {
    return SEED_RESOURCES.filter((r) => r.kind === kind && (!city || !r.city || r.city === city || r.city === "National")).map(
      (r: SeedResource) => ({ name: r.name, phone: r.phone, kind: r.kind })
    );
  },
};
