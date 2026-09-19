import { NextResponse } from "next/server";
import { z } from "zod";
import { memoryStore } from "@/lib/store/memory";
import { graph } from "@/lib/adapters";
import { demoIncident } from "@/data/demo-incident";

const UpdateSchema = z.object({
  status: z.enum(["active", "safe", "handed_off", "closed"]).optional(),
  notifyContactsOk: z.boolean().optional(),
  notifyPoliceOk: z.boolean().optional(),
  speakFreely: z.boolean().optional(),
  allClear: z.boolean().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (id === "demo") {
    const seed = demoIncident();
    const existing = memoryStore.get("demo");
    return NextResponse.json({ incident: existing ?? seed });
  }
  const incident = memoryStore.get(id);
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  return NextResponse.json({ incident });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const incident = memoryStore.get(id);
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const now = new Date().toISOString();
  if (parsed.data.status) incident.status = parsed.data.status;
  if (typeof parsed.data.notifyContactsOk === "boolean") incident.notifyContactsOk = parsed.data.notifyContactsOk;
  if (typeof parsed.data.notifyPoliceOk === "boolean") incident.notifyPoliceOk = parsed.data.notifyPoliceOk;
  if (typeof parsed.data.speakFreely === "boolean") incident.speakFreely = parsed.data.speakFreely;
  if (parsed.data.allClear) {
    incident.messages.push({ id: `m_${Date.now().toString(36)}`, role: "system", text: "All-clear sent to contacts: user marked themselves safe.", at: now });
  }
  memoryStore.save(incident);
  await graph.upsertIncident(incident);
  return NextResponse.json({ incident });
}
