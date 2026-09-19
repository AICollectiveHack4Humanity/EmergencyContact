import { NextResponse } from "next/server";
import { z } from "zod";
import { graph } from "@/lib/adapters";
import { memoryStore } from "@/lib/store/memory";
import type { Incident } from "@/lib/types";

const StartSchema = z.object({
  userName: z.string().default("Maya"),
  type: z.enum(["silent_safety", "mental_health", "medical", "followed", "general"]).default("silent_safety"),
  speakFreely: z.boolean().default(false),
  location: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }).optional(),
});

function defaultContacts(): Incident["people"] {
  return [
    {
      id: "c_priya",
      name: process.env.CONTACT_1_NAME || "Priya",
      role: "contact",
      phone: process.env.CONTACT_1_PHONE || "+15555550101",
      notes: "Contact 1",
    },
    {
      id: "c_jordan",
      name: process.env.CONTACT_2_NAME || "Jordan",
      role: "contact",
      phone: process.env.CONTACT_2_PHONE || "+15555550102",
      notes: "Contact 2",
    },
  ];
}

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userName, type, speakFreely, location } = parsed.data;
  const now = new Date().toISOString();
  const contacts = defaultContacts();
  const incident: Incident = {
    id: `inc_${Date.now().toString(36)}`,
    type,
    urgency: type === "general" ? "medium" : "high",
    status: "active",
    speakFreely,
    notifyContactsOk: true,
    notifyPoliceOk: false,
    startedAt: now,
    user: { id: "u_user", name: userName, role: "user" },
    people: [{ id: "u_user", name: userName, role: "user" }, ...contacts],
    observations: [],
    locations: location
      ? [{ ...location, at: now }]
      : [{ lat: 37.7897, lng: -122.3972, label: "SoMa, San Francisco", at: now }],
    messages: [{ id: `m_${Date.now().toString(36)}`, role: "haven", text: speakFreely ? "I'm here with you. What's happening?" : "Noted. You're not alone.", at: now, silent: !speakFreely }],
    notices: [],
    resourcesUsed: [],
    summary: `${userName} opened a Haven session (${type}).`,
  };
  memoryStore.save(incident);
  await graph.upsertIncident(incident);
  return NextResponse.json({ incident });
}
