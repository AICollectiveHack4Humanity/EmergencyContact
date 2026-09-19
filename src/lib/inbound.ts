import { memoryStore } from "./store/memory";
import { graph, llm } from "./adapters";
import { mergeClassifyResult } from "./merge";
import { DEFAULT_LOCATION } from "./geo";
import type { Incident } from "./types";

export const SESSION_URL =
  `${process.env.HAVEN_PUBLIC_URL?.replace(/\/$/, "") || "https://haven-eight-sigma.vercel.app"}/session`;

const GREETING = /^(hi|hey|hello|yo|start|help)\b/i;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

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

function findSenderIncident(from?: string): Incident | undefined {
  if (!from) return memoryStore.active();
  const involves = (i: Incident) => i.user.phone === from || i.people.some((p) => p.phone === from);
  const all = memoryStore.list();
  return all.find((i) => i.status === "active" && involves(i)) ?? all.find(involves);
}

export interface InboundResult {
  incident: Incident;
  /** Reply text for the sender (null when nothing should be sent back). */
  reply: string | null;
  created: boolean;
}

function sessionLinkReply(): string {
  return `Haven here — your private session is open:\n${SESSION_URL}\nReply here with details (clothes, injuries, where you are) and I'll log them.`;
}

/**
 * Shared inbound-SMS logic for the Spectrum webhook and the legacy JSON path.
 * - Greeting (or first text from an unknown sender) → create incident + link reply.
 * - Follow-up from a known sender → attach + analyze (no auto-reply; avoids loops).
 */
export async function handleInboundText({
  from,
  text,
}: {
  from?: string;
  text: string;
}): Promise<InboundResult> {
  const clean = text.trim().slice(0, 1000);
  const now = new Date().toISOString();
  const isGreeting = GREETING.test(clean) || clean.length === 0;

  let incident = findSenderIncident(from);
  let created = false;

  if (!incident) {
    const contacts = defaultContacts();
    incident = {
      id: `inc_${Date.now().toString(36)}`,
      type: "general",
      urgency: "medium",
      status: "active",
      speakFreely: true,
      notifyContactsOk: true,
      notifyPoliceOk: false,
      startedAt: now,
      user: { id: "u_user", name: "Text user", role: "user", phone: from, notes: "Joined by text message." },
      people: [
        { id: "u_user", name: "Text user", role: "user", phone: from, notes: "Joined by text message." },
        ...contacts,
      ],
      observations: [],
      locations: [{ ...DEFAULT_LOCATION, at: now }],
      messages: [],
      notices: [],
      resourcesUsed: [],
      summary: "Session started by text message.",
    };
    created = true;
  }

  if (clean) {
    incident.messages.push({
      id: uid("m"),
      role: "user",
      text: clean,
      at: now,
      silent: !incident.speakFreely,
    });
  }

  if (!created && !isGreeting && clean) {
    // Enrich the case from follow-up texts; never auto-reply (loop-safe).
    try {
      const result = await llm.classifyAndExtract({ incident, userText: clean });
      mergeClassifyResult(incident, result, now);
    } catch {
      /* keep the attached message; analysis can retry next text */
    }
  }

  memoryStore.save(incident);
  try {
    await graph.upsertIncident(incident);
  } catch {
    /* graph must never break inbound SMS */
  }

  const reply = created || isGreeting ? sessionLinkReply() : null;
  return { incident, reply, created };
}
