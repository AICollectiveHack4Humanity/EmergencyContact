import { NextResponse } from "next/server";
import { z } from "zod";
import { graph, llm, messaging } from "@/lib/adapters";
import { memoryStore } from "@/lib/store/memory";

const NotifySchema = z.object({ incidentId: z.string() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = NotifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const incident = memoryStore.get(parsed.data.incidentId);
  if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

  // Mental-health guardrail: never surprise-notify unless explicitly pre-authorized.
  if (incident.type === "mental_health" && !incident.notifyContactsOk) {
    return NextResponse.json(
      { error: "Mental-health path: contacts are only notified if the user asks. Flip notifyContactsOk first." },
      { status: 403 }
    );
  }

  const contacts = incident.people.filter((p) => p.role === "contact" && p.phone);
  if (contacts.length === 0) return NextResponse.json({ error: "No contacts with phone numbers on this incident." }, { status: 400 });

  const now = new Date().toISOString();
  const loc = incident.locations[incident.locations.length - 1];
  const sent = [];
  for (const c of contacts) {
    const draft = await llm.draftContactMessage(incident, c);
    try {
      // INTEGRATION: Photon send happens here (via messaging adapter).
      const notice = await messaging.notifyContact({ toName: c.name, toPhone: c.phone!, body: draft, location: loc });
      incident.notices.push(notice);
      sent.push(notice);
    } catch (e) {
      // Photon misconfigured at runtime: fall back to mock so the demo survives.
      const { mockMessaging } = await import("@/lib/adapters/messaging");
      const notice = await mockMessaging.notifyContact({ toName: c.name, toPhone: c.phone!, body: draft, location: loc });
      incident.notices.push({ ...notice, status: "failed" });
      sent.push({ ...notice, status: "failed" as const, body: `${notice.body}\n[photon error: ${e instanceof Error ? e.message : "send failed"}]` });
    }
  }
  incident.messages.push({ id: `m_${Date.now().toString(36)}`, role: "system", text: `Notified ${sent.map((s) => s.toName).join(", ")} (${messaging.mode}).`, at: now });
  memoryStore.save(incident);
  await graph.upsertIncident(incident);
  return NextResponse.json({ incident, notices: sent, via: messaging.mode });
}
