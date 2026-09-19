import { NextResponse } from "next/server";
import { z } from "zod";
import { memoryStore } from "@/lib/store/memory";
import { graph } from "@/lib/adapters";

const WebhookSchema = z.object({
  from: z.string().optional(),
  text: z.string().optional(),
  body: z.string().optional(),
  incidentId: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = WebhookSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const text = parsed.data.text ?? parsed.data.body ?? "";
  const incident = (parsed.data.incidentId && memoryStore.get(parsed.data.incidentId)) || memoryStore.active();
  if (!incident) return NextResponse.json({ ok: true, attached: false, reason: "no active incident" });
  if (!text) return NextResponse.json({ ok: true, attached: false, reason: "empty text" });

  incident.messages.push({
    id: `m_${Date.now().toString(36)}`,
    role: "contact",
    text: `${parsed.data.from ? `${parsed.data.from}: ` : ""}${text}`.slice(0, 1000),
    at: new Date().toISOString(),
  });
  memoryStore.save(incident);
  await graph.upsertIncident(incident);
  return NextResponse.json({ ok: true, attached: true, incidentId: incident.id });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST { from, text } to attach an inbound contact message to the active incident." });
}
