import { NextResponse } from "next/server";
import { z } from "zod";
import { graph, llm } from "@/lib/adapters";
import { memoryStore } from "@/lib/store/memory";
import type { Observation } from "@/lib/types";

const ImgSchema = z.object({
  incidentId: z.string(),
  imageDataUrl: z.string().min(32).max(12_000_000),
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = ImgSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const incident = memoryStore.get(parsed.data.incidentId);
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  const now = new Date().toISOString();
  incident.messages.push({ id: `m_${Date.now().toString(36)}`, role: "user", text: "[photo shared]", at: now, silent: !incident.speakFreely });
  if (parsed.data.location) incident.locations.push({ ...parsed.data.location, at: now });

  let result;
  let llmError: string | null = null;
  const locForLlm = parsed.data.location ? { ...parsed.data.location, at: now } : undefined;
  try {
    result = await llm.classifyAndExtract({ incident, imageDataUrl: parsed.data.imageDataUrl, location: locForLlm });
  } catch (e) {
    const { mockLlm, sanitizeLlmError } = await import("@/lib/adapters/llm");
    result = await mockLlm.classifyAndExtract({ incident, imageDataUrl: parsed.data.imageDataUrl });
    llmError = llm.mode === "mock" ? null : sanitizeLlmError(e);
    if (llmError) console.warn("[haven] Gemini vision failed, fell back to mock:", llmError);
  }

  incident.type = result.type;
  incident.urgency = result.urgency;
  incident.summary = result.summary || incident.summary;
  const seen = new Set(incident.observations.map((o) => `${o.kind}::${o.text.toLowerCase()}`));
  for (const o of result.observations) {
    const key = `${o.kind}::${o.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const full: Observation = { ...o, id: `o_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`, at: now };
    incident.observations.push(full);
  }
  incident.messages.push({ id: `m_${Date.now().toString(36)}_h`, role: "haven", text: result.reply, at: now, silent: !incident.speakFreely });

  memoryStore.save(incident);
  await graph.upsertIncident(incident);
  return NextResponse.json({ incident, reply: result.reply, llmError });
}
