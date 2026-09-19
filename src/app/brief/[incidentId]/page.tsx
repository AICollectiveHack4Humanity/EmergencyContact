"use client";

import { use, useEffect, useState } from "react";
import type { Incident } from "@/lib/types";
import { OfficerPacket } from "@/components/brief/OfficerPacket";
import { GraphSummary } from "@/components/brief/GraphSummary";
import { Timeline } from "@/components/brief/Timeline";
import { StatusPill } from "@/components/shared/StatusPill";
import { elapsedSince } from "@/lib/formatBrief";

interface BriefData {
  incident: Incident;
  officerBrief: string;
  briefing: { cypherPreview: string; relatedResourceNames: string[]; fallback?: boolean } | null;
}

export default function BriefPage({ params }: { params: Promise<{ incidentId: string }> }) {
  const { incidentId } = use(params);
  const [data, setData] = useState<BriefData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Briefing endpoint drafts the officer brief + graph preview server-side.
        const r = await fetch("/api/actions/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incidentId }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Briefing unavailable");
        if (!cancelled) setData(j);
      } catch {
        // Cold open fallback: seed demo still renders a complete case.
        try {
          const r = await fetch(`/api/session/${incidentId}`);
          const j = await r.json();
          if (j.incident && !cancelled) {
            setData({ incident: j.incident, officerBrief: j.incident.summary, briefing: null });
            return;
          }
        } catch { /* ignore */ }
        if (!cancelled) setError("Couldn't load this case. Try /brief/demo.");
      }
    })();
    return () => { cancelled = true; };
  }, [incidentId]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#17181c] p-6 text-center">
        <p className="text-sm text-stone-400">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#17181c]">
        <p className="text-sm text-stone-500">Assembling case file…</p>
      </div>
    );
  }
  const { incident, officerBrief, briefing } = data;

  return (
    <div className="min-h-dvh bg-[#17181c] text-stone-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-4">
          <div>
            <p className="font-serif text-xl text-[#d6c08a]">Haven</p>
            <p className="mt-0.5 font-mono text-xs text-stone-500">case {incident.id} · {elapsedSince(incident.startedAt)} elapsed</p>
          </div>
          <StatusPill urgency={incident.urgency} status={incident.status} fallback={briefing?.fallback} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <OfficerPacket incident={incident} />

        <section className="rounded-2xl border border-white/10 bg-[#22242b] p-5">
          <h2 className="text-xs uppercase tracking-widest text-stone-500">Officer brief</h2>
          <pre className="mt-2 whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-stone-200">{officerBrief}</pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { navigator.clipboard?.writeText(officerBrief).catch(() => {}); }}
              className="min-h-[44px] rounded-full bg-[#d6c08a] px-5 text-sm font-semibold text-[#17181c]"
            >
              Copy
            </button>
            <button onClick={() => window.print()} className="min-h-[44px] rounded-full border border-white/15 px-5 text-sm text-stone-200">
              Print
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#22242b] p-5">
          <h2 className="mb-3 text-xs uppercase tracking-widest text-stone-500">Timeline</h2>
          <Timeline incident={incident} />
        </section>

        {briefing && <GraphSummary cypher={briefing.cypherPreview} />}

        <section className="rounded-2xl border border-white/10 bg-[#22242b] p-5">
          <h2 className="mb-2 text-xs uppercase tracking-widest text-stone-500">Resources used</h2>
          {(briefing?.relatedResourceNames ?? incident.resourcesUsed).length === 0 ? (
            <p className="text-sm text-stone-500">None recorded.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-stone-200">
              {(briefing?.relatedResourceNames ?? incident.resourcesUsed).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </section>

        <p className="pb-8 text-center font-mono text-xs text-stone-600">
          Haven never auto-calls 911. Confirm with subject or dispatcher.
        </p>
      </main>
    </div>
  );
}
