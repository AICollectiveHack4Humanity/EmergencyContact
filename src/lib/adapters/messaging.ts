import type { GeoPoint, OutboundNotice } from "../types";
import { memoryStore } from "../store/memory";
import { mapsUrl } from "../geo";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

export interface NotifyInput {
  toName: string;
  toPhone: string;
  body: string;
  location?: GeoPoint;
}

export interface MessagingAdapter {
  readonly mode: "live" | "mock";
  notifyContact(input: NotifyInput): Promise<OutboundNotice>;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Append the required location line if the caller forgot it. */
export function withLocationLine(body: string, location?: GeoPoint): string {
  if (!location) return body;
  if (body.includes("maps.google.com")) return body;
  return `${body}\nLast location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (${location.label ?? "pinned"})\n${mapsUrl(location)}`;
}

// ---------------------------------------------------------------------------
// Mock messaging — console log + in-memory outbox. Default happy path.
// ---------------------------------------------------------------------------
export const mockMessaging: MessagingAdapter = {
  mode: "mock",
  async notifyContact(input: NotifyInput): Promise<OutboundNotice> {
    const notice: OutboundNotice = {
      id: uid("msg"),
      toName: input.toName,
      toPhone: input.toPhone,
      body: withLocationLine(input.body, input.location),
      channel: "mock",
      status: "mocked",
      at: new Date().toISOString(),
    };
    console.log(`[haven mock imessage] to ${input.toName} <${input.toPhone}>:\n${notice.body}`);
    memoryStore.pushOutbox(notice);
    return notice;
  },
};

// ---------------------------------------------------------------------------
// Photon messaging — real iMessage path behind PHOTON_ENABLED=true.
// Credentials: SPECTRUM_PROJECT_ID + SPECTRUM_PROJECT_SECRET (dashboard Settings;
// PHOTON_PROJECT_ID / PHOTON_PROJECT_SECRET accepted as aliases).
// Uses cloud auto-discovery: no per-line tokens needed, tokens auto-renew.
// ---------------------------------------------------------------------------

function spectrumCreds(): { projectId: string; projectSecret: string } {
  const projectId = process.env.SPECTRUM_PROJECT_ID ?? process.env.PHOTON_PROJECT_ID ?? "";
  const projectSecret = process.env.SPECTRUM_PROJECT_SECRET ?? process.env.PHOTON_PROJECT_SECRET ?? "";
  if (!projectId || !projectSecret) {
    throw new Error("Photon credentials missing: set SPECTRUM_PROJECT_ID + SPECTRUM_PROJECT_SECRET (see dashboard Settings).");
  }
  return { projectId, projectSecret };
}

/** Shared Spectrum app (cloud iMessage, auto-discovered lines). */
export async function spectrumApp() {
  const { projectId, projectSecret } = spectrumCreds();
  return Spectrum({
    projectId,
    projectSecret,
    providers: [imessage.config()],
  });
}

export const photonMessaging: MessagingAdapter = {
  mode: "live",
  async notifyContact(input: NotifyInput): Promise<OutboundNotice> {
    const body = withLocationLine(input.body, input.location);
    // INTEGRATION: Photon send happens here (DM create + send).
    const app = await spectrumApp();
    try {
      const im = imessage(app);
      const user = await im.user(input.toPhone);
      const dm = await im.space.create(user);
      await dm.send(body);
      return { id: uid("imsg"), toName: input.toName, toPhone: input.toPhone, body, channel: "imessage", status: "sent", at: new Date().toISOString() };
    } finally {
      await app.stop().catch(() => {});
    }
  },
};
