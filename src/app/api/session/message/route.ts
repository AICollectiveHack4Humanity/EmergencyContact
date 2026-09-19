import { NextResponse } from "next/server";
import { z } from "zod";
import { graph, llm } from "@/lib/adapters";
import { memoryStore } from "@/lib/store/memory";
import { shapeReplyForPolicy } from "@/lib/policy";
import { mergeClassifyResult } from "@/lib/merge";

const MsgSchema = z.object({
  incidentId: z.string(),
  text: z.string().min(1).max(2000),
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }).optional(),
});

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
  let llmError: string | null = null;
  let result;
  const locForLlm = parsed.data.location ? { ...parsed.data.location, at: now } : undefined;
  try {
    result = await llm.classifyAndExtract({
      incident,
      userText: parsed.data.text,
      location: locForLlm,
    });
  } catch (e) {
    const { mockLlm, sanitizeLlmError } = await import("@/lib/adapters/llm");
    result = await mockLlm.classifyAndExtract({ incident, userText: parsed.data.text, location: locForLlm });
    usedFallback = true;
    llmError = sanitizeLlmError(e);
    console.warn("[haven] Gemini call failed, fell back to mock:", llmError);
  }
  if (llm.mode === "mock") {
    usedFallback = false; // mock is the intended path, not a fallback
    llmError = null;
  }

  // Merge classification (people first so observations link to person ids).
  const { addedObservations } = mergeClassifyResult(incident, result, now);

  const reply = shapeReplyForPolicy(incident, result.reply);
  incident.messages.push({ id: `m_${Date.now().toString(36)}_h`, role: "haven", text: reply, at: now, silent: !incident.speakFreely });

  memoryStore.save(incident);
  await graph.upsertIncident(incident);

  return NextResponse.json({ incident, reply, llmFallback: usedFallback, llmError, newObservations: addedObservations, suggestedActions: result.suggestedActions });
}
