"use client";

import type { Incident } from "@/lib/types";
import { formatBriefPacket, elapsedSince } from "@/lib/formatBrief";

export function OfficerPacket({ incident }: { incident: Incident }) {
  const p = formatBriefPacket(incident);
  return (
    <section aria-label="15-second packet" className="rounded-2xl border border-[#d6c08a]/25 bg-[#22242b] p-5">
      <p className="text-xs uppercase tracking-widest text-[#d6c08a]">15-second packet · {elapsedSince(incident.startedAt)} in</p>
      <dl className="mt-3 space-y-2 font-serif text-lg leading-snug">
        <div><dt className="inline text-sm text-stone-500 font-sans">Who — </dt><dd className="inline">{p.who}</dd></div>
        <div><dt className="inline text-sm text-stone-500 font-sans">Where last — </dt><dd className="inline">{p.whereLast}</dd></div>
        <div><dt className="inline text-sm text-stone-500 font-sans">Injuries — </dt><dd className="inline">{p.injuries}</dd></div>
        <div><dt className="inline text-sm text-stone-500 font-sans">Clothing — </dt><dd className="inline">{p.clothing}</dd></div>
        <div><dt className="inline text-sm text-stone-500 font-sans">Notified — </dt><dd className="inline">{p.notified}</dd></div>
      </dl>
      {p.unknowns.length > 0 && (
        <p className="mt-3 text-sm text-stone-400">Open unknowns: {p.unknowns.join(" · ")}</p>
      )}
    </section>
  );
}
