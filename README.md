# Haven — silent crisis agent

A person in danger opens a page that looks like Notes / Weather — not a red SOS app.
They type, share a photo, or share location. Haven classifies the situation, extracts
structured facts, notifies emergency contacts over iMessage with live location, and
writes a case graph so a responder gets up to speed in 15 seconds.

Haven never auto-calls 911. It drafts a 911 script that requires an explicit confirm.
The mental-health path defaults to 988 / stay-with-them, not police.

## Run it

```bash
npm i
npm run dev
```

Open http://localhost:3000. It looks like an "Errands" notes app. Activate with any of:

- type `weather looks bad` into the note + return
- long-press the "Errands" title (1.5s)
- triple-tap the bottom-right margin
- visit `/?pin=2580`

Demo PIN is `2580`. Then `/session` (crisis chat), `/brief/demo` (responder case file),
`/settings` (contacts, adapters, mock outbox, **Run judge demo**).

## Env

Copy `.env.example` to `.env.local`. All secrets stay in `.env.local`, never committed.

| Var | Effect |
| --- | --- |
| `GEMINI_API_KEY` | set → live Gemini Flash; unset → smart mock LLM |
| `GEMINI_MODEL` | optional pin (default `gemini-flash-latest` rolling alias, free tier). If calls fail, the session toast shows the model + HTTP error |
| `PHOTON_ENABLED=true` + `PHOTON_*` | live iMessage via Photon; otherwise mock outbox |
| `FALKORDB_ENABLED=true` + `FALKORDB_*` | live FalkorDB graph; otherwise in-memory mock graph |
| `CONTACT_1/2_NAME/PHONE` | prefilled demo contacts (Maya's sister Priya, advocate Jordan) |
| `NEXT_PUBLIC_DEMO_PIN` / `NEXT_PUBLIC_PASSPHRASE` | stealth activation secrets |

## How mocks work

Every external system goes through `src/lib/adapters/*` behind one barrel
(`src/lib/adapters/index.ts`): env vars are the only switch. UI and API routes only
talk to adapters.

- **LLM** (`llm.ts`): `mockLlm` handles code words (`weather looks bad`, `can't talk`,
  `he's here`), 988/mental-health, followed/BART, medical keywords, photo extracts —
  never lorem ipsum. `geminiLlm` calls Gemini 2.5 Flash with strict JSON and falls back
  to mock with an "LLM fallback" toast.
- **Messaging** (`messaging.ts`): mock logs + in-memory outbox (visible in Settings).
  Photon tries `spectrum-ts` then `@photon-ai/advanced-imessage` (`npm i spectrum-ts`,
  credentials from the Photon dashboard). Every contact message carries the
  do-not-call header + live location + maps link.
- **Graph** (`graph.ts`): mock persists in `src/lib/store/memory.ts` but still returns
  a Cypher preview for the briefing page. FalkorDB (`npm i falkordb`,
  `docker run -p 6379:6379 falkordb/falkordb`) runs the real upserts/queries and falls
  back to mock with a yellow "graph fallback" pill.

Human finishes Gemini / Photon / FalkorDB using the integration steps in the adapter
comments; do not block the UI on them — mock is the default happy path for the demo.
