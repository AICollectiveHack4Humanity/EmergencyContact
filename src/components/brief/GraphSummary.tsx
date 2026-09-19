"use client";

import { useState } from "react";

export function GraphSummary({ cypher }: { cypher: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-white/10 bg-black/30">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-stone-300">
        <span>Graph query {open ? "▾" : "▸"}</span>
        <span className="text-xs text-stone-500">FalkorDB · Cypher</span>
      </button>
      {open && (
        <pre className="overflow-x-auto border-t border-white/10 p-4 font-mono text-xs leading-relaxed text-[#9db29a]">{cypher}</pre>
      )}
    </section>
  );
}
