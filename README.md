# Haven — silent crisis agent

A person in danger opens Haven and gets a calm, dark crisis session — not a red SOS app.
They type, share a photo, go live on camera, or share location. Haven classifies the
situation, extracts structured facts, notifies emergency contacts over iMessage with
live location, and writes a case graph so a responder gets up to speed in 15 seconds.

Haven never auto-calls 911. It drafts a 911 script that requires an explicit confirm.
The mental-health path defaults to 988 / stay-with-them, not police.

## Run it

```bash
npm i
npm run dev
```

**[Try Haven](https://haven-eight-sigma.vercel.app)**
 it opens the session dashboard directly: `/session`
(crisis chat), `/brief/demo` (responder case file), `/settings` (contacts, adapters,
mock outbox, **Run judge demo**). Demo PIN is `2580`.

## Env

Copy `.env.example` to `.env.local`. All secrets stay in `.env.local`, never committed.

| Var | Effect |
| --- | --- |
| `GEMINI_API_KEY` | set → live Gemini Flash; unset → smart mock LLM |
| `GEMINI_MODEL` | optional pin (default `gemini-flash-latest` rolling alias, free tier). If calls fail, the session toast shows the model + HTTP error |
| `PHOTON_ENABLED=true` + `PHOTON_*` | live iMessage via Photon; otherwise mock outbox |
| `FALKORDB_ENABLED=true` + `FALKORDB_*` | live FalkorDB graph; otherwise in-memory mock graph |
| `CONTACT_1/2_NAME/PHONE` | prefilled demo contacts (Maya's sister Priya, advocate Jordan) |
| `NEXT_PUBLIC_DEMO_PIN` | demo PIN shown in settings |

## How it works

The only live external system is Gemini (`GEMINI_API_KEY` set → live Flash model,
unset → smart mock LLM that handles code words, 988/mental-health, followed/BART,
medical keywords, and photo extracts). Everything else is local: outbound notices
land in an in-memory outbox (visible in Settings) and the case store persists in
`src/lib/store/memory.ts`. Every contact message carries the do-not-call header +
live location + maps link, and the briefing page shows the case query.

## Live camera + perpetrator attribution

- **Attribution**: clothing/injury observations link to who they describe. "He's wearing
  a hoodie" → perpetrator (`Unknown adult male`); "my lip is split" → you. The fact rail
  has a dedicated *Perpetrator clothing* section and the officer brief annotates entries
  (`dark hoodie (perpetrator: Unknown adult male)`). Works in mock and Gemini paths
  (the model is instructed via `aboutRole`).
- **Live camera** (`● Live` button in session): `getUserMedia` preview, one analyzed
  frame/sec via `POST /api/session/live-frame`, plus live captions via the Web Speech API
  (Chrome/Edge; iOS Safari gets frames without captions). Frames merge silently into the
  case (dedupe keeps repeat frames free); urgency escalation posts a system note.
  On free-tier 429s the loop backs off automatically (up to 30s) instead of dying.
  Note: sustained 1fps burns ~3600 req/hr against the ~1500/day free quota — use short
  bursts for the demo.
