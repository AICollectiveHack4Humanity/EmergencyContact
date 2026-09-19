"use client";

import type { Incident } from "@/lib/types";

export function Timeline({ incident }: { incident: Incident }) {
  const events: { at: string; label: string; detail: string }[] = [
    ...incident.locations.map((l) => ({ at: l.at, label: "Location", detail: `${l.label ?? "Pin"} · ${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}` })),
    ...incident.observations.map((o) => ({ at: o.at, label: o.kind, detail: `${o.text} (${Math.round(o.confidence * 100)}%)` })),
    ...incident.notices.map((n) => ({ at: n.at, label: `Message → ${n.toName}`, detail: `${n.channel} · ${n.status}` })),
    ...incident.messages.filter((m) => m.role === "contact").map((m) => ({ at: m.at, label: "Inbound contact", detail: m.text })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  if (events.length === 0) return <p className="text-sm text-stone-500">No timeline events yet.</p>;

  return (
    <ol className="relative space-y-3 border-l border-white/10 pl-5">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-[#d6c08a]" aria-hidden />
          <p className="text-sm font-medium text-stone-200">{e.label}</p>
          <p className="text-sm text-stone-400">{e.detail}</p>
          <p className="text-xs text-stone-600">{new Date(e.at).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  );
}
