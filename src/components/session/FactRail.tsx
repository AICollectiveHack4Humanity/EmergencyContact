"use client";

import type { Incident } from "@/lib/types";
import { StatusPill } from "@/components/shared/StatusPill";
import { MapPin } from "@/components/shared/MapPin";
import { lastLocationLabel } from "@/lib/geo";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-stone-500">{label}</span>
      <span className="text-right text-stone-200">{value}</span>
    </div>
  );
}

export function FactRail({ incident }: { incident: Incident }) {
  const clothing = incident.observations.filter((o) => o.kind === "clothing");
  const injuries = incident.observations.filter((o) => o.kind === "injury");
  const people = incident.people.filter((p) => p.role !== "contact");
  const loc = incident.locations[incident.locations.length - 1];

  return (
    <div className="space-y-5 p-4 text-sm">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Case</h3>
        <StatusPill urgency={incident.urgency} status={incident.status} />
        <div className="mt-2 divide-y divide-white/5">
          <Row label="Type" value={incident.type.replace("_", " ")} />
          <Row label="Speak freely?" value={incident.speakFreely ? "Yes" : "No"} />
          <Row label="Contacts OK" value={incident.notifyContactsOk ? "Yes" : "No"} />
        </div>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">People</h3>
        {people.length === 0 && <p className="text-stone-500">Unknown</p>}
        {people.map((p) => (
          <p key={p.id} className="py-0.5 text-stone-200">
            {p.name} <span className="text-stone-500">· {p.role}</span>
          </p>
        ))}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Clothing</h3>
        {clothing.length === 0 ? <p className="text-stone-500">Unknown</p> : clothing.map((o) => <p key={o.id} className="py-0.5 text-stone-200">{o.text}</p>)}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Injuries</h3>
        {injuries.length === 0 ? <p className="text-stone-500">Unknown</p> : injuries.map((o) => <p key={o.id} className="py-0.5 text-stone-200">{o.text}</p>)}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Location trail</h3>
        <MapPin label={loc ? lastLocationLabel(incident.locations) : "Unknown"} />
        {incident.locations.length > 1 && (
          <p className="mt-1 text-xs text-stone-500">{incident.locations.length} pins</p>
        )}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Actions taken</h3>
        {incident.notices.length === 0 ? (
          <p className="text-stone-500">None yet</p>
        ) : (
          incident.notices.map((n) => (
            <p key={n.id} className="py-0.5 text-stone-200">
              {n.toName} <span className="text-stone-500">· {n.status}</span>
            </p>
          ))
        )}
      </div>
    </div>
  );
}
