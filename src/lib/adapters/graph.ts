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
    `// Haven case-graph query (runs on FalkorDB when FALKORDB_ENABLED=true)`,
    `MATCH (i:Incident {id: $id})  // $id = "${incidentId}"`,
    `OPTIONAL MATCH (u:Person)-[:SUBJECT_OF]->(i)`,
    `OPTIONAL MATCH (p:Person)-[:INVOLVED_IN]->(i)`,
    `OPTIONAL MATCH (i)-[:HAS]->(o:Observation)`,
    `OPTIONAL MATCH (i)-[:OCCURRED_AT]->(loc:Location)`,
    `OPTIONAL MATCH (i)-[:NOTIFIED]->(c:Person)`,
    `OPTIONAL MATCH (i)-[:USED_RESOURCE]->(r:Resource)`,
    `RETURN i, u, collect(distinct p), collect(distinct o), collect(distinct loc), collect(distinct c), collect(distinct r)`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Mock graph — module-level Map store, but still returns a Cypher preview
// so the briefing page shows "what FalkorDB will run".
// ---------------------------------------------------------------------------
export const mockGraph: GraphAdapter = {
  mode: "mock",
  async upsertIncident(incident: Incident): Promise<void> {
    memoryStore.save(incident);
  },
  async getBriefing(incidentId: string): Promise<Briefing> {
    const incident = memoryStore.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found in mock graph.`);
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

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// FalkorDB graph — real Cypher path behind FALKORDB_ENABLED=true.
// Local: run FalkorDB (docker) on localhost:6379. Hosted: FalkorDB Cloud
// (app.falkordb.cloud) — set FALKORDB_URL=falkors://user:pass@host:port
// (FALKORDB_HOST/PORT/USERNAME/PASSWORD also work). Falls back to mockGraph
// with a "graph fallback" pill when unreachable.
// ---------------------------------------------------------------------------
import { FalkorDB } from "falkordb";

function connOptions(): { url?: string; host?: string; port?: number; username?: string; password?: string } {
  const url = process.env.FALKORDB_URL?.trim();
  if (url) return { url };
  return {
    host: process.env.FALKORDB_HOST ?? "localhost",
    port: Number(process.env.FALKORDB_PORT ?? 6379),
    username: process.env.FALKORDB_USERNAME || undefined,
    password: process.env.FALKORDB_PASSWORD || undefined,
  };
}

function graphName(): string {
  return process.env.FALKORDB_GRAPH ?? "haven";
}

export const falkorGraph: GraphAdapter = {
  mode: "live",
  async upsertIncident(incident: Incident): Promise<void> {
    try {
      // INTEGRATION: FalkorDB upsert happens here (nodes + rels).
      const db = await FalkorDB.connect({ ...connOptions(), socket: { connectTimeout: 5000 } });
      try {
        const g = db.selectGraph(graphName());
        const q = (cypher: string, params: Record<string, unknown> = {}) => g.query(cypher, { params });
        // Schema-tolerant upserts (MERGE so demo re-runs are idempotent).
        await q(`MERGE (i:Incident {id: $id}) SET i.type=$type, i.urgency=$urgency, i.status=$status, i.summary=$summary`, {
          id: incident.id, type: incident.type, urgency: incident.urgency, status: incident.status, summary: incident.summary,
        });
        for (const p of [incident.user, ...incident.people]) {
          await q(`MERGE (p:Person {id: $id}) SET p.name=$name, p.role=$role`, { id: p.id, name: p.name, role: p.role });
          const rel = p.role === "user" ? "SUBJECT_OF" : p.role === "contact" ? "NOTIFIED" : "INVOLVED_IN";
          await q(`MATCH (p:Person {id: $pid}), (i:Incident {id: $iid}) MERGE (p)-[:${rel}]->(i)`, { pid: p.id, iid: incident.id });
        }
        for (const o of incident.observations) {
          await q(`MERGE (o:Observation {id: $id}) SET o.kind=$kind, o.text=$text MERGE (i:Incident {id: $iid}) MERGE (i)-[:HAS]->(o)`, {
            id: o.id, kind: o.kind, text: o.text, iid: incident.id,
          });
        }
        for (const l of incident.locations) {
          await q(`CREATE (loc:Location {lat:$lat, lng:$lng, label:$label, at:$at}) WITH loc MATCH (i:Incident {id:$iid}) CREATE (i)-[:OCCURRED_AT]->(loc)`, {
            lat: l.lat, lng: l.lng, label: l.label ?? "", at: l.at, iid: incident.id,
          });
        }
        for (const r of SEED_RESOURCES) {
          await q(`MERGE (r:Resource {name:$name}) SET r.phone=$phone, r.kind=$kind`, { name: r.name, phone: r.phone, kind: r.kind });
        }
      } finally {
        await db.close().catch(() => {});
      }
      memoryStore.save(incident);
    } catch (e) {
      console.warn("[haven] FalkorDB unreachable, using mockGraph fallback:", e instanceof Error ? e.message : e);
      memoryStore.save(incident);
    }
  },
  async getBriefing(incidentId: string): Promise<Briefing> {
    const incident = memoryStore.get(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found.`);
    const base = {
      incident,
      cypherPreview: cypherForBriefing(incidentId),
      relatedResourceNames: incident.resourcesUsed,
    };
    try {
      const db = await FalkorDB.connect({ ...connOptions(), socket: { connectTimeout: 5000 } });
      try {
        const g = db.selectGraph(graphName());
        const check = await g.roQuery(`MATCH (i:Incident {id: $id}) RETURN i.id AS id`, { params: { id: incidentId } });
        const live = (check.data?.length ?? 0) > 0;
        return { ...base, fallback: live ? false : true };
      } finally {
        await db.close().catch(() => {});
      }
    } catch {
      return { ...base, fallback: true };
    }
  },
  async searchResources(kind, city) {
    return mockGraph.searchResources(kind, city);
  },
};
