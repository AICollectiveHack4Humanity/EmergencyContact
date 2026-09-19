"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OutboundNotice } from "@/lib/types";

interface Health {
  gemini: "live" | "mock";
  photon: "live" | "mock";
  falkordb: "live" | "mock";
}

function AdapterRow({ name, mode }: { name: string; mode: "live" | "mock" | undefined }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-stone-300">{name}</span>
      <span
        className={
          mode === "live"
            ? "rounded-full border border-[#9db29a]/40 bg-[#9db29a]/15 px-2.5 py-0.5 text-xs text-[#9db29a]"
            : "rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-stone-400"
        }
      >
        {mode === "live" ? "Connected" : "Mock"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [health, setHealth] = useState<Health | null>(null);
  const [outbox, setOutbox] = useState<OutboundNotice[]>([]);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const h = await fetch("/api/health").then((r) => r.json());
      setHealth(h);
    } catch { /* offline */ }
    try {
      const o = await fetch("/api/outbox").then((r) => r.json());
      setOutbox(o.outbox ?? []);
    } catch { /* offline */ }
  };

  useEffect(() => { refresh(); }, []);

  const runDemo = async () => {
    setRunning(true);
    try {
      const r = await fetch("/api/demo?action=run", { method: "POST" });
      const j = await r.json();
      if (j.incidentId) {
        try { localStorage.setItem("haven:incidentId", j.incidentId); } catch { /* ignore */ }
        router.push(`/brief/${j.incidentId}`);
      } else setMsg("Demo failed to start.");
    } catch {
      setMsg("Demo failed to start.");
    } finally {
      setRunning(false);
    }
  };

  const reset = async () => {
    await fetch("/api/demo?action=reset", { method: "POST" });
    try { localStorage.removeItem("haven:incidentId"); } catch { /* ignore */ }
    setOutbox([]);
    setMsg("Demo store reset.");
    refresh();
  };

  return (
    <div className="min-h-dvh bg-[#17181c] text-stone-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <span className="font-serif text-xl text-[#d6c08a]">Haven</span>
          <a href="/session" className="min-h-[44px] rounded-full border border-white/15 px-4 py-2 text-sm text-stone-200">← Session</a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <section className="rounded-2xl border border-white/10 bg-[#22242b] p-5">
          <h2 className="text-xs uppercase tracking-widest text-stone-500">Demo controls</h2>
          <p className="mt-1 text-sm text-stone-400">
            Demo PIN <span className="font-mono text-stone-200">{process.env.NEXT_PUBLIC_DEMO_PIN ?? "2580"}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={runDemo} disabled={running} className="min-h-[44px] rounded-full bg-[#d6c08a] px-5 text-sm font-semibold text-[#17181c] disabled:opacity-50">
              {running ? "Starting…" : "Run judge demo"}
            </button>
            <button onClick={reset} className="min-h-[44px] rounded-full border border-white/15 px-5 text-sm text-stone-200">
              Reset demo store
            </button>
          </div>
          {msg && <p className="mt-2 text-sm text-stone-400" role="status">{msg}</p>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#22242b] p-5">
          <h2 className="text-xs uppercase tracking-widest text-stone-500">Contacts</h2>
          <p className="mt-1 text-sm text-stone-400">
            {process.env.CONTACT_1_NAME ?? "Priya"} · <span className="font-mono">{process.env.CONTACT_1_PHONE ?? "+15555550101"}</span>
            <br />
            {process.env.CONTACT_2_NAME ?? "Jordan"} · <span className="font-mono">{process.env.CONTACT_2_PHONE ?? "+15555550102"}</span>
          </p>
          <p className="mt-2 text-xs text-stone-500">Set names + E.164 phones in .env.local (CONTACT_1_*, CONTACT_2_*). Prefilled for demo.</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#22242b] p-5">
          <h2 className="text-xs uppercase tracking-widest text-stone-500">Adapters</h2>
          <div className="divide-y divide-white/5">
            <AdapterRow name="Gemini (LLM)" mode={health?.gemini} />
            <AdapterRow name="Photon (iMessage)" mode={health?.photon} />
            <AdapterRow name="FalkorDB (graph)" mode={health?.falkordb} />
          </div>
          <p className="mt-2 text-xs text-stone-500">Read from /api/health. Mock is the default happy path — set keys to go live.</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#22242b] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-stone-500">Mock iMessage outbox</h2>
            <button onClick={refresh} className="min-h-[44px] rounded-full border border-white/15 px-4 text-sm text-stone-300">Refresh</button>
          </div>
          {outbox.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Nothing sent yet. Tap “Notify contacts” in a session.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {outbox.map((n) => (
                <li key={n.id} className="rounded-xl bg-black/30 p-3">
                  <p className="text-sm font-medium text-stone-200">To {n.toName} <span className="font-mono text-xs text-stone-500">{n.toPhone}</span></p>
                  <pre className="mt-1 whitespace-pre-wrap text-xs text-stone-400">{n.body}</pre>
                  <p className="mt-1 text-xs text-stone-600">{n.status} · {new Date(n.at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
