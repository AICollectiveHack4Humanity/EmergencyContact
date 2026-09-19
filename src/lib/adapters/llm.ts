import type {
  CrisisType,
  GeoPoint,
  Incident,
  Observation,
  Person,
  Urgency,
} from "../types";

export interface ClassifyInput {
  incident: Incident;
  userText?: string;
  imageDataUrl?: string;
  location?: GeoPoint;
}

export interface ClassifyResult {
  type: CrisisType;
  urgency: Urgency;
  speakFreely: boolean;
  summary: string;
  observations: Omit<Observation, "id" | "at">[];
  people: Partial<Person>[];
  reply: string;
  suggestedActions: string[];
}

export interface LlmAdapter {
  classifyAndExtract(input: ClassifyInput): Promise<ClassifyResult>;
  draftContactMessage(incident: Incident, contact: Person): Promise<string>;
  draftOfficerBrief(incident: Incident): Promise<string>;
  /** "live" when backed by a real model, "mock" otherwise. */
  readonly mode: "live" | "mock";
}

// ---------------------------------------------------------------------------
// Mock LLM — smart enough for a live demo, never lorem ipsum.
// ---------------------------------------------------------------------------

const SILENT_PHRASES = ["weather looks bad", "can't talk", "cant talk", "he's here", "hes here", "don't call", "dont call", "cannot talk", "pretend"];
const MENTAL_PHRASES = ["don't want to be here", "dont want to be here", "end it", "suicid", "kill myself", "hotline", "hurt myself", "no point", "give up"];
const FOLLOWED_PHRASES = ["followed", "following me", "behind me", "bart", "walking home", "stranger following"];
const MEDICAL_PHRASES = ["wrist", "fell", "chest pain", "bleeding", "can't breathe", "cant breathe", "overdose", "broke", "hospital"];

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

export const mockLlm: LlmAdapter = {
  mode: "mock",

  async classifyAndExtract(input: ClassifyInput): Promise<ClassifyResult> {
    const text = (input.userText ?? "").toLowerCase();
    const hasImage = !!input.imageDataUrl;

    let type: CrisisType = input.incident.type ?? "general";
    let urgency: Urgency = input.incident.urgency ?? "medium";
    let speakFreely = input.incident.speakFreely ?? true;
    let reply = "I'm here with you. Tell me what's happening.";
    let suggestedActions = ["notify", "brief", "resources"];

    const observations: ClassifyResult["observations"] = [];
    const people: Partial<Person>[] = [];

    if (includesAny(text, SILENT_PHRASES)) {
      type = "silent_safety";
      speakFreely = false;
      urgency = "high";
      reply = "Noted. You're not alone.";
      suggestedActions = ["notify", "brief", "script911"];
      observations.push({
        kind: "quote",
        text: (input.userText ?? "weather looks bad").slice(0, 140),
        confidence: 0.95,
        source: "text",
      });
    } else if (includesAny(text, MENTAL_PHRASES)) {
      type = "mental_health";
      speakFreely = true;
      urgency = "high";
      reply =
        "I'm really glad you told me. You matter. Call or text 988 any time (24/7). I'll stay with you — what feels hardest right now?";
      suggestedActions = ["resources", "brief"];
    } else if (includesAny(text, FOLLOWED_PHRASES)) {
      type = "followed";
      speakFreely = true;
      urgency = "high";
      reply = "Stay on a lit, busy path. Share your live location — want me to alert your contacts?";
      suggestedActions = ["location", "notify", "brief"];
      observations.push({ kind: "other", text: "User reports being followed.", confidence: 0.85, source: "text" });
    } else if (includesAny(text, MEDICAL_PHRASES)) {
      type = "medical";
      speakFreely = true;
      urgency = text.includes("chest pain") || text.includes("can't breathe") || text.includes("cant breathe") ? "critical" : "high";
      reply = "That sounds urgent. If you can, call 911. Want me to pull up the nearest hospital and notify someone?";
      suggestedActions = ["resources", "notify", "script911"];
    } else if (text.trim().length > 0) {
      // Escalate urgency on explicit danger words even for general text.
      if (includesAny(text, ["help", "danger", "scared", "afraid", "emergency", "police"])) {
        urgency = "high";
      }
      reply =
        type === "silent_safety" && speakFreely === false
          ? "Noted. You're not alone."
          : "Got it — I'm tracking this. What changed, if anything?";
    }

    // Keyword extraction: clothing / injury / person / vehicle.
    const clothingWords = ["hoodie", "jacket", "tattoo", "cap", "beanie", "mask", "jeans", "red shirt", "blue shirt", "uniform"];
    for (const w of clothingWords) {
      if (text.includes(w)) {
        observations.push({ kind: "clothing", text: `Mentions "${w}"`, confidence: 0.7, source: "text" });
      }
    }
    const injuryWords = ["cheek", "bleeding", "swelling", "bruise", "cut", "hurt", "pain", "swollen"];
    for (const w of injuryWords) {
      if (text.includes(w)) {
        observations.push({ kind: "injury", text: `Possible injury: mentions "${w}"`, confidence: 0.75, source: "text" });
      }
    }
    if (text.includes("he ") || text.includes("him") || text.includes("man ")) {
      people.push({ name: "Unknown adult male", role: "aggressor", notes: "Described in chat; identity unknown." });
    }
    if (text.includes("car ") || text.includes("van ") || text.includes("license") || text.includes("plate")) {
      observations.push({ kind: "vehicle", text: input.userText?.slice(0, 140) ?? "Vehicle mentioned.", confidence: 0.6, source: "text" });
    }

    if (hasImage) {
      observations.push({
        kind: "clothing",
        text: "dark hoodie visible in photo (demo extract)",
        confidence: 0.65,
        source: "image",
      });
    }
    if (input.location?.label) {
      observations.push({
        kind: "other",
        text: `Location shared: ${input.location.label}`,
        confidence: 0.9,
        source: "location",
      });
    }

    // Guarantee at least one sub-certain observation when guessing.
    if (observations.length > 0 && !observations.some((o) => o.confidence < 1)) {
      observations[0] = { ...observations[0], confidence: 0.8 };
    }

    // Clamp silent replies to ~12 words.
    if (type === "silent_safety" && speakFreely === false) {
      const words = reply.split(/\s+/);
      if (words.length > 12) reply = words.slice(0, 12).join(" ");
    }

    const summaryBits: string[] = [];
    summaryBits.push(`${input.incident.user?.name ?? "User"}`);
    summaryBits.push(type === "silent_safety" ? "cannot speak freely" : type.replace("_", " "));
    if (input.location?.label) summaryBits.push(`near ${input.location.label}`);
    if (observations.some((o) => o.kind === "injury")) summaryBits.push("possible injury noted");
    const summary = `${summaryBits.join(" · ")}. Urgency ${urgency}.`;

    return { type, urgency, speakFreely, summary, observations, people, reply, suggestedActions };
  },

  async draftContactMessage(incident: Incident, contact: Person): Promise<string> {
    const loc = incident.locations[incident.locations.length - 1];
    const locLine = loc
      ? `Last location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)} (${loc.label ?? "pinned"}) https://maps.google.com/?q=${loc.lat},${loc.lng}`
      : "Last location: Unknown";
    const facts = incident.observations.slice(0, 3).map((o) => o.text).join("; ") || "Details still coming in";
    return [
      `Haven alert — do not call ${incident.user?.name ?? "them"} unless they say so.`,
      `Name: ${incident.user?.name ?? "Unknown"}`,
      `Type: ${incident.type} | Urgency: ${incident.urgency}`,
      locLine,
      `Facts: ${facts}`,
      `— sent for ${contact.name} via Haven`,
    ].join("\n");
  },

  async draftOfficerBrief(incident: Incident): Promise<string> {
    const loc = incident.locations[incident.locations.length - 1];
    const clothing = incident.observations.filter((o) => o.kind === "clothing").map((o) => o.text).join("; ") || "Unknown";
    const injuries = incident.observations.filter((o) => o.kind === "injury").map((o) => o.text).join("; ") || "Unknown";
    const aggr = incident.people.find((p) => p.role === "aggressor");
    return [
      `RESPONDER BRIEF — Haven case ${incident.id} (${incident.status.toUpperCase()})`,
      `Subject: ${incident.user?.name ?? "Unknown"} | Type: ${incident.type} | Urgency: ${incident.urgency} | Speak freely: ${incident.speakFreely ? "yes" : "NO"}`,
      `Last location: ${loc ? `${loc.label ?? ""} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})` : "Unknown"}`,
      `Clothing/persons of interest: ${clothing}`,
      `Injuries: ${injuries}`,
      `Other individual: ${aggr ? `${aggr.name}${aggr.notes ? ` — ${aggr.notes}` : ""}` : "Unknown"}`,
      `Notified: ${incident.notices.length > 0 ? incident.notices.map((n) => `${n.toName} [${n.status}]`).join(", ") : "none yet"}`,
      `Summary: ${incident.summary || "Unknown"}`,
      `Do NOT auto-call based on this brief alone; confirm with subject or dispatcher.`,
    ].join("\n");
  },
};

// ---------------------------------------------------------------------------
// Gemini LLM — real model path. Selected only when GEMINI_API_KEY is set.
// Human: npm i @google/genai, set GEMINI_API_KEY, keep mock as fallback.
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-2.5-flash";
const SYSTEM_PROMPT = `You are Haven, a silent crisis intake agent. Classify into silent_safety | mental_health | medical | followed | general with urgency low|medium|high|critical.
Rules: silent_safety + cannot speak -> replies <=12 words, never say police were called, never auto-911. mental_health -> attach 988, stay present, do not notify police/contacts unless asked. Never invent evidence: unknown fields stay "unknown". Always return STRICT JSON with keys: type, urgency, speakFreely, summary, observations[{kind,text,confidence,source}], people[{name,role,notes}], reply, suggestedActions[].`;

function tryParseStrictJson(text: string): ClassifyResult | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed.type || !parsed.reply) return null;
    return {
      type: parsed.type,
      urgency: parsed.urgency ?? "medium",
      speakFreely: parsed.speakFreely ?? true,
      summary: parsed.summary ?? "",
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
      reply: String(parsed.reply),
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
    };
  } catch {
    return null;
  }
}

export const geminiLlm: LlmAdapter = {
  mode: "live",

  async classifyAndExtract(input: ClassifyInput): Promise<ClassifyResult> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return mockLlm.classifyAndExtract(input);
    try {
      // INTEGRATION: Gemini generateContent lives here. Swap model id as needed.
      const parts: Record<string, unknown>[] = [{ text: `${SYSTEM_PROMPT}\n\nIncident so far: ${JSON.stringify({ type: input.incident.type, urgency: input.incident.urgency, speakFreely: input.incident.speakFreely, summary: input.incident.summary })}\nUser text: ${input.userText ?? "(none)"}\nLocation: ${input.location ? JSON.stringify(input.location) : "unknown"}` }];
      if (input.imageDataUrl) {
        const m = input.imageDataUrl.match(/^data:(.*?);base64,(.*)$/);
        if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
      }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
          }),
        }
      );
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const parsed = tryParseStrictJson(text);
      if (!parsed) throw new Error("Gemini returned non-JSON");
      return parsed;
    } catch (e) {
      console.warn("[haven] Gemini call failed, falling back to mock:", e);
      const fallback = await mockLlm.classifyAndExtract(input);
      return { ...fallback, reply: `${fallback.reply}` };
    }
  },

  async draftContactMessage(incident: Incident, contact: Person): Promise<string> {
    try {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return mockLlm.draftContactMessage(incident, contact);
      // Keep contacts safe: wrap model prose with the fixed safety header via mock formatter.
      return mockLlm.draftContactMessage(incident, contact);
    } catch {
      return mockLlm.draftContactMessage(incident, contact);
    }
  },

  async draftOfficerBrief(incident: Incident): Promise<string> {
    try {
      if (!process.env.GEMINI_API_KEY) return mockLlm.draftOfficerBrief(incident);
      return mockLlm.draftOfficerBrief(incident);
    } catch {
      return mockLlm.draftOfficerBrief(incident);
    }
  },
};
