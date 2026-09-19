"use client";

const NOTES = ["oat milk", "pick up dry cleaning", "text mom back", "2pm pharmacy"];

export function NotesShell({
  value,
  onChange,
  onSubmit,
  onTitleHold,
  onMarginTripleTap,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onTitleHold: () => void;
  onMarginTripleTap: () => void;
}) {
  return (
    <div className="min-h-dvh bg-[#f7f2e9] text-stone-800">
      <div className="mx-auto max-w-md px-5 pb-24 pt-6">
        <div className="flex items-center justify-between">
          <button
            className="select-none text-[15px] font-semibold tracking-tight text-stone-700"
            onPointerDown={(e) => {
              const t = setTimeout(onTitleHold, 1500);
              const up = () => {
                clearTimeout(t);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointerup", up);
            }}
          >
            Errands
          </button>
          <span className="text-xs text-stone-400">Edited 9:41 AM</span>
        </div>
        <ul className="mt-6 space-y-4">
          {NOTES.map((n) => (
            <li key={n} className="flex items-start gap-3 border-b border-stone-900/5 pb-4 text-[16px] text-stone-700">
              <span className="mt-1.5 h-4 w-4 rounded-full border border-stone-400" aria-hidden />
              {n}
            </li>
          ))}
        </ul>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label htmlFor="stealth-note" className="sr-only">
            New note
          </label>
          <input
            id="stealth-note"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="New note…"
            autoComplete="off"
            className="w-full rounded-xl bg-white/70 px-4 py-3.5 text-[16px] text-stone-800 shadow-sm outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-stone-300"
          />
        </form>
        {/* triple-tap margin zone */}
        <button
          aria-label="margin"
          onClick={onMarginTripleTap}
          className="fixed bottom-0 right-0 h-24 w-24 touch-manipulation"
          style={{ WebkitTapHighlightColor: "transparent" }}
        />
        <span className="fixed bottom-2 left-3 select-none text-lg font-serif text-stone-900 opacity-[0.08]" aria-hidden>
          H
        </span>
      </div>
    </div>
  );
}
