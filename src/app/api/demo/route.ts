import { NextResponse } from "next/server";
import { memoryStore } from "@/lib/store/memory";
import { graph, messaging, llm } from "@/lib/adapters";
import { demoIncident } from "@/data/demo-incident";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "run";

  if (action === "reset") {
    memoryStore.clear();
    return NextResponse.json({ ok: true, reset: true });
  }

  // "Run judge demo": reset, seed silent_safety incident, send 2 mock iMessages.
  memoryStore.clear();
  const incident = demoIncident();
  incident.id = `inc_${Date.now().toString(36)}`;
  memoryStore.save(incident);
  await graph.upsertIncident(incident);

  const contacts = incident.people.filter((p) => p.role === "contact" && p.phone);
  const loc = incident.locations[incident.locations.length - 1];
  for (const c of contacts.slice(0, 2)) {
    const draft = await llm.draftContactMessage(incident, c);
    try {
      const notice = await messaging.notifyContact({ toName: c.name, toPhone: c.phone!, body: draft, location: loc });
      incident.notices.push(notice);
    } catch {
      const { mockMessaging } = await import("@/lib/adapters/messaging");
      incident.notices.push(await mockMessaging.notifyContact({ toName: c.name, toPhone: c.phone!, body: draft, location: loc }));
    }
  }
  incident.messages.push({ id: `m_${Date.now().toString(36)}`, role: "system", text: `Judge demo: notified ${incident.notices.map((n) => n.toName).join(", ")}.`, at: new Date().toISOString() });
  memoryStore.save(incident);
  await graph.upsertIncident(incident);

  return NextResponse.json({ ok: true, incidentId: incident.id, incident });
}
