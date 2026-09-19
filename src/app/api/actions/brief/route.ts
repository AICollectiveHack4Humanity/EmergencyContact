import { NextResponse } from "next/server";
import { z } from "zod";
import { graph, llm } from "@/lib/adapters";
import { memoryStore } from "@/lib/store/memory";
import { demoIncident } from "@/data/demo-incident";

const BriefSchema = z.object({ incidentId: z.string() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = BriefSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let incident = memoryStore.get(parsed.data.incidentId);
  if (!incident && parsed.data.incidentId === "demo") {
    incident = demoIncident();
    memoryStore.save(incident);
  }
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  const [officerBrief, briefing] = await Promise.all([
    llm.draftOfficerBrief(incident),
    graph.getBriefing(incident.id).catch(() => graph.getBriefing("demo").catch(() => null)),
  ]);
  return NextResponse.json({ incident, officerBrief, briefing });
}
