import { NextResponse } from "next/server";
import { z } from "zod";
import { graph, llm } from "@/lib/adapters";
import { sanitizeLlmError } from "@/lib/adapters/llm";
import { memoryStore } from "@/lib/store/memory";
import { mergeClassifyResult, URGENCY_RANK } from "@/lib/merge";

const LiveFrameSchema = z.object({
  incidentId: z.string(),
  imageDataUrl: z.string().min(32).max(8_000_000),
  transcript: z.string().max(2000).optional(),
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }).optional(),
});

function isRateLimit(message: string): boolean {
  return /HTTP 429|rate|quota|RESOURCE_EXHAUSTED/i.test(message);
}

/**
 * Live camera tick: one analyzed frame (+ optional heard speech).
 * Merges new observations silently — no Haven chat reply per frame, so the
 * transcript doesn't flood at 1fps. Dedupe keeps repeat frames free.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = LiveFrameSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const incident = memoryStore.get(parsed.data.incidentId);
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  const now = new Date().toISOString();
  if (parsed.data.transcript?.trim()) {
    incident.messages.push({
      id: `m_${Date.now().toString(36)}`,
      role: "user",
      text: parsed.data.transcript.trim().slice(0, 1000),
      at: now,
      silent: !incident.speakFreely,
    });
  }
  if (parsed.data.location) incident.locations.push({ ...parsed.data.location, at: now });

  let result;
  try {
    result = await llm.classifyAndExtract({
      incident,
      imageDataUrl: parsed.data.imageDataUrl,
      userText: parsed.data.transcript?.trim() || undefined,
      location: parsed.data.location ? { ...parsed.data.location, at: now } : undefined,
    });
  } catch (e) {
    const llmError = sanitizeLlmError(e);
    console.warn("[haven] live frame analysis failed:", llmError);
    memoryStore.save(incident);
    try {
      await graph.upsertIncident(incident);
    } catch { /* graph must never break live capture */ }
    // No mock merge here: a failed live analysis must not invent observations.
    return NextResponse.json(
      { incident, newObservations: 0, escalated: false, llmError },
      { status: isRateLimit(llmError) ? 429 : 502 }
    );
  }

  const before = incident.observations.length;
  const { prevUrgency } = mergeClassifyResult(incident, result, now);
  const escalated = URGENCY_RANK[incident.urgency] > URGENCY_RANK[prevUrgency];
  if (escalated) {
    incident.messages.push({
      id: `m_${Date.now().toString(36)}_sys`,
      role: "system",
      text: `Haven noticed escalation via live feed: urgency ${prevUrgency} → ${incident.urgency}.`,
      at: now,
    });
  }

  memoryStore.save(incident);
  try {
    await graph.upsertIncident(incident);
  } catch { /* graph must never break live capture */ }

  return NextResponse.json({
    incident,
    newObservations: incident.observations.length - before,
    escalated,
    llmError: null,
  });
}
