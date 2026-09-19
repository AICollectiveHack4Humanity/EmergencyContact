"use client";

import { useEffect, useState } from "react";
import type { Incident } from "@/lib/types";
import { CopyIcon } from "@/components/shared/icons";

/**
 * Case graph section: what is stored and where, so an authority can look the
 * case up later. Sections, not nested cards: one heading, data rows, actions.
 */
export function CaseGraphSection({ incident }: { incident: Incident }) {
  const [graphMode, setGraphMode] = useState<"live" | "mock" | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => {
        if (!cancelled) setGraphMode(h.falkordb === "live" ? "live" : "mock");
      })
      .catch(() => {
        if (!cancelled) setGraphMode("mock");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(incident.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="p-4 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Case graph</h3>
      <p className="mt-1 text-[13px] leading-snug text-stone-600">
        Every fact above is stored as a linked case record for authority lookup.
      </p>
      <p className="mt-2">
        {graphMode === "live" ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-900">
            FalkorDB · Connected
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-600">
            {graphMode === null ? "Checking store…" : "Local store · FalkorDB on deploy"}
          </span>
        )}
      </p>
      <dl className="mt-2 divide-y divide-stone-200">
        <div className="flex justify-between py-1.5">
          <dt className="text-stone-500">People</dt>
          <dd className="font-medium tabular-nums text-stone-900">{incident.people.length}</dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="text-stone-500">Observations</dt>
          <dd className="font-medium tabular-nums text-stone-900">{incident.observations.length}</dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="text-stone-500">Locations</dt>
          <dd className="font-medium tabular-nums text-stone-900">{incident.locations.length}</dd>
        </div>
        <div className="flex justify-between py-1.5">
          <dt className="text-stone-500">Notices sent</dt>
          <dd className="font-medium tabular-nums text-stone-900">{incident.notices.length}</dd>
        </div>
      </dl>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-stone-200/70 px-2 py-1.5 font-mono text-xs text-stone-800">
          {incident.id}
        </code>
        <button
          onClick={copyId}
          className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-stone-300 px-4 text-sm text-stone-800"
          aria-label="Copy case ID for authority lookup"
        >
          <CopyIcon className="h-4 w-4" />
          {copied ? "Copied" : "Copy ID"}
        </button>
      </div>
      <a
        href={`/brief/${incident.id}`}
        className="mt-2 inline-block min-h-[44px] rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white"
      >
        Open responder briefing
      </a>
    </div>
  );
}
