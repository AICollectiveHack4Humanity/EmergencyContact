import type { GeoPoint, OutboundNotice } from "../types";
import { memoryStore } from "../store/memory";
import { mapsUrl } from "../geo";

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
// Human: `npm i spectrum-ts` (preferred) or `@photon-ai/advanced-imessage`,
// then fill PHOTON_* env vars from the https://photon.codes dashboard.
// ---------------------------------------------------------------------------
export const photonMessaging: MessagingAdapter = {
  mode: "live",
  async notifyContact(input: NotifyInput): Promise<OutboundNotice> {
    const body = withLocationLine(input.body, input.location);
    const address = process.env.PHOTON_IMESSAGE_ADDRESS;
    const token = process.env.PHOTON_IMESSAGE_TOKEN;
    if (!address || !token) {
      throw new Error("Photon env incomplete (need PHOTON_IMESSAGE_ADDRESS + PHOTON_IMESSAGE_TOKEN).");
    }
    // INTEGRATION: Photon send happens here.
    // Preferred provider: spectrum-ts
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import(/* webpackIgnore: true */ "spectrum-ts").catch(() => null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prov: any = await import(/* webpackIgnore: true */ "spectrum-ts/providers/imessage").catch(() => null);
      if (mod?.Spectrum && prov?.imessage) {
        const spectrum = new mod.Spectrum({
          projectId: process.env.PHOTON_PROJECT_ID,
          projectSecret: process.env.PHOTON_PROJECT_SECRET,
        });
        const provider = prov.imessage({ address, token });
        await spectrum.send(provider, { to: input.toPhone, text: body });
        return { id: uid("imsg"), toName: input.toName, toPhone: input.toPhone, body, channel: "imessage", status: "sent", at: new Date().toISOString() };
      }
    } catch (e) {
      console.warn("[haven] spectrum-ts path failed, trying fallback:", e);
    }
    // Fallback provider: @photon-ai/advanced-imessage
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientMod: any = await import(/* webpackIgnore: true */ "@photon-ai/advanced-imessage").catch(() => null);
      if (clientMod?.createClient) {
        const client = clientMod.createClient({ address, token });
        const chat = await client.chats.create([input.toPhone]);
        await client.messages.sendText(chat.guid, body);
        return { id: uid("imsg"), toName: input.toName, toPhone: input.toPhone, body, channel: "imessage", status: "sent", at: new Date().toISOString() };
      }
    } catch (e) {
      console.warn("[haven] advanced-imessage path failed:", e);
    }
    throw new Error(
      "Photon send unavailable: install `spectrum-ts` or `@photon-ai/advanced-imessage` and set PHOTON_* env vars. See comments in src/lib/adapters/messaging.ts."
    );
  },
};
