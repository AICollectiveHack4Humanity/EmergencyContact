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

// Outbound notices land in the in-memory outbox, visible on /settings.
// (Former Photon iMessage integration was removed; this is the only path.)
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
    console.log(`[haven outbox] to ${input.toName} <${input.toPhone}>:\n${notice.body}`);
    memoryStore.pushOutbox(notice);
    return notice;
  },
};
