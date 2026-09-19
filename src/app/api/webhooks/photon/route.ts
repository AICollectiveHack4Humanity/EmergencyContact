import { NextResponse } from "next/server";
import { z } from "zod";
import { handleInboundText } from "@/lib/inbound";

// Dedupe at-least-once Spectrum deliveries by message id.
const seenIds = new Set<string>();

function spectrumConfigured(): boolean {
  return (
    !!(process.env.SPECTRUM_PROJECT_ID ?? process.env.PHOTON_PROJECT_ID) &&
    !!(process.env.SPECTRUM_PROJECT_SECRET ?? process.env.PHOTON_PROJECT_SECRET)
  );
}

const WebhookSchema = z.object({
  from: z.string().optional(),
  text: z.string().optional(),
  body: z.string().optional(),
  incidentId: z.string().optional(),
});

export async function POST(req: Request) {
  // Live Spectrum path: HMAC-verified webhook → (space, message) handler.
  // Works with a plain Next.js route: pass the raw request through.
  if (spectrumConfigured()) {
    try {
      const { spectrumApp } = await import("@/lib/adapters/messaging");
      const app = await spectrumApp();
      try {
        return await app.webhook(req, async (space, message) => {
          try {
            if (!message || message.platform !== "imessage") return;
            const content = message.content as { type?: string; text?: string } | undefined;
            if (!content || content.type !== "text" || !content.text?.trim()) return;
            if (message.id) {
              if (seenIds.has(message.id)) return;
              seenIds.add(message.id);
              if (seenIds.size > 500) {
                const first = seenIds.values().next().value;
                if (first) seenIds.delete(first);
              }
            }
            const sender = message.sender as { address?: string; id?: string } | undefined;
            const from = sender?.address ?? sender?.id;
            const { reply } = await handleInboundText({ from, text: content.text });
            // INTEGRATION: Photon reply happens here (plain send into the DM space).
            if (reply) await space.send(reply);
          } catch (e) {
            console.warn("[haven] inbound handler failed:", e);
          }
        });
      } finally {
        await app.stop().catch(() => {});
      }
    } catch (e) {
      console.warn("[haven] spectrum webhook failed, trying legacy parse:", e);
      // fall through to the legacy JSON path below
    }
  }

  // Legacy JSON path (mock-safe): POST { from, text }.
  const body = await req.json().catch(() => ({}));
  const parsed = WebhookSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const text = parsed.data.text ?? parsed.data.body ?? "";
  if (!text.trim()) return NextResponse.json({ ok: true, attached: false, reason: "empty text" });

  const { incident, reply, created } = await handleInboundText({ from: parsed.data.from, text });

  let replied = false;
  if (reply && parsed.data.from && /^\+\d{7,15}$/.test(parsed.data.from)) {
    try {
      const { messaging } = await import("@/lib/adapters");
      const loc = incident.locations[incident.locations.length - 1];
      await messaging.notifyContact({
        toName: incident.user.name ?? "there",
        toPhone: parsed.data.from,
        body: reply,
        location: loc,
      });
      replied = true;
    } catch (e) {
      console.warn("[haven] link reply failed:", e);
    }
  }
  return NextResponse.json({ ok: true, attached: true, created, replied, incidentId: incident.id });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    spectrum: spectrumConfigured() ? "live" : "mock",
    hint: "POST { from, text } for the mock path; configure Photon dashboard webhook to this URL for live iMessage.",
  });
}
