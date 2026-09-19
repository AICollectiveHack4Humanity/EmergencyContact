"use client";

export function StealthToggle({ stealth, onToggle }: { stealth: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={stealth}
      title="Skins the session back to Notes mid-crisis"
      className="min-h-[44px] rounded-full border border-white/15 px-4 text-sm text-stone-300"
    >
      {stealth ? "Exit cover" : "Cover: Notes"}
    </button>
  );
}
