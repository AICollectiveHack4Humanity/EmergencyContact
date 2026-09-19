import { NextResponse } from "next/server";
import { z } from "zod";
import { graph, llm } from "@/lib/adapters";
import { memoryStore } from "@/lib/store/memory";
import { shapeReplyForPolicy } from "@/lib/policy";
import type { Observation } from "@/lib/types";

const MsgSchema = z.object({
  incidentId: z.string(),
  text: z.string().min(1).max(2000),
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }).optional(),
});

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = MsgSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const incident = memoryStore.get(parsed.data.incidentId);
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  const now = new Date().toISOString();
  incident.messages.push({ id: `m_${Date.now().toString(36)}`, role: "user", text: parsed.data.text, at: now, silent: !incident.speakFreely });
  if (parsed.data.location) {
    incident.locations.push({ ...parsed.data.location, at: now });
  }

  let usedFallback = false;
  let result;
  const locForLlm = parsed.data.location ? { ...parsed.data.location, at: now } : undefined;
  try {
    result = await llm.classifyAndExtract({
      incident,
      userText: parsed.data.text,
      location: locForLlm,
    });
  } catch {
    const { mockLlm } = await import("@/lib/adapters/llm");
    result = await mockLlm.classifyAndExtract({ incident, userText: parsed.data.text, location: locForLlm });
    usedFallback = true;
  }
  if (llm.mode === "mock") usedFallback = false; // mock is the intended path, not a fallback

  // Merge classification.
  incident.type = result.type;
  incident.urgency = result.urgency;
  incident.speakFreely = result.speakFreely;
  incident.summary = result.summary || incident.summary;

  // Merge observations, dedupe by kind + normalized text.
  const seen = new Set(incident.observations.map((o) => `${o.kind}::${normalize(o.text)}`));
  for (const o of result.observations) {
    const key = `${o.kind}::${normalize(o.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const full: Observation = { ...o, id: `o_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`, at: now };
    incident.observations.push(full);
  }
  // Merge people (by name+role).
  for (const p of result.people) {
    if (!p.name) continue;
    const exists = incident.people.some((x) => x.name === p.name && (p.role ? x.role === p.role : true));
    if (!exists) {
      incident.people.push({ id: `p_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`, name: p.name, role: p.role ?? "witness", phone: p.phone, notes: p.notes ?? "Extracted from chat; verify." });
    }
  }

  const reply = shapeReplyForPolicy(incident, result.reply);
  incident.messages.push({ id: `m_${Date.now().toString(36)}_h`, role: "haven", text: reply, at: now, silent: !incident.speakFreely });

  memoryStore.save(incident);
  await graph.upsertIncident(incident);

  return NextResponse.json({ incident, reply, llmFallback: usedFallback, suggestedActions: result.suggestedActions });
}
