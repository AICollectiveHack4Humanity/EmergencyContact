# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Any person in a crisis situation, all categories ranked equally: intimate-partner /
silent-safety, mental health, medical, being followed, general help. No single hero
persona outranks the others for future tiebreaks.

Secondary audiences: the user's emergency contacts (who receive iMessage alerts with
live location) and responders (who read the case briefing). Demo stand-ins: Maya
(person in crisis), Priya (sister, contact), Jordan (advocate, contact).

## Product Purpose

Haven is a crisis intake and handoff tool. It classifies what is happening, extracts
structured facts (people, clothing, injuries, quotes, locations), notifies trusted
contacts, and produces a responder briefing that reads in 15 seconds. Success is a
responder getting up to speed in 15 seconds and contacts receiving accurate, live
location without the user having to make a phone call.

## Positioning

A neutral crisis utility: a plain, direct tool that is neither disguised nor
alarming. It does not pose as another app, and it does not use SOS-red emergency
chrome. What a neighboring crisis app could not truthfully copy: silent-first intake
(short quiet replies when the user cannot speak freely) fused with a live case graph
that attributes every fact to the right person.

## Operating Context

- Mobile-first web app; demos run on a laptop but must work in an iPhone viewport.
- Built and evaluated at a 1-day humanity hackathon; judge demo path is a first-class
  workflow (`/settings` → Run judge demo → responder briefing, zero keys required).
- Operates with a live Gemini model when keyed, otherwise a smart mock; messaging
  and case storage are local-only (outbox + in-memory store).
- Live camera analysis runs at ~1 frame/sec with live captions where the browser
  allows; free-tier quotas require short bursts and automatic backoff.

## Capabilities and Constraints

- Confirmed capabilities: text/photo/location intake; crisis classification
  (silent_safety, mental_health, medical, followed, general) with urgency;
  perpetrator-vs-user attribution for clothing and injuries; live camera frame
  analysis with captions; trusted-contact notify with maps link; draft 911 script
  requiring explicit confirm; "I'm safe" all-clear; responder briefing with
  15-second packet, timeline, Cypher preview, and officer brief.
- Locked constraints: every external system goes through `src/lib/adapters/*`
  with mock-on by default; Haven never auto-calls 911 and never auto-dials;
  mental-health path defaults to 988 / stay-with-them, never police or surprise
  contact notify; unknown fields stay `unknown` and render as "Unknown" — evidence
  is never invented.
- Undecided: multi-incident responder queue, authentication beyond the demo PIN (`2580`).

## Brand Commitments

Name: Haven, "H" monogram. Voice: neutral, plain, direct — neither discreet-coded
nor alarming. No other binding visual commitments recorded.

## Evidence on Hand

- Working Next.js 15 + TypeScript + Tailwind codebase in this repo (`src/`).
- Seed demo incident (`src/data/demo-incident.ts`) and SF resource list
  (`src/data/seed-resources.ts`: 988, DV hotline, W.O.M.A.N. Inc, 311 shelter,
  SF General, SFPD non-emergency).
- Absences future work must not fabricate: no real provider keys are wired, no
  real user data or testimonials exist, no production deployment claims.

## Product Principles

1. The person in crisis types the least; the system assembles the most.
2. Every fact names who it describes — especially the perpetrator, never by default
   the victim.
3. No action with irreversible consequences happens without an explicit confirm.
4. The demo path always works with zero keys; live providers enhance, never gate.
5. Responders read, never chat: fifteen seconds to full context.

## Accessibility & Inclusion

Large tap targets (44px minimum), `prefers-reduced-motion` respected, quiet text
replies that do not alarm. No product-specific accessibility standard beyond this
has been established.
