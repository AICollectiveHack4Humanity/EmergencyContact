"use client";

const HOURS = [
  { t: "Now", d: "64°" },
  { t: "2pm", d: "66°" },
  { t: "3pm", d: "66°" },
  { t: "4pm", d: "65°" },
  { t: "5pm", d: "63°" },
  { t: "6pm", d: "61°" },
];

export function WeatherShell({
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
    <div className="min-h-dvh bg-gradient-to-b from-[#2b3a4a] to-[#10161d] text-white">
      <div className="mx-auto max-w-md px-5 pb-24 pt-10 text-center">
        <button className="select-none" onPointerDown={() => {
          const t = setTimeout(onTitleHold, 1500);
          const up = () => { clearTimeout(t); window.removeEventListener("pointerup", up); };
          window.addEventListener("pointerup", up);
        }}>
          <div className="text-lg font-medium">San Francisco</div>
          <div className="mt-1 text-7xl font-extralight">64°</div>
          <div className="mt-1 text-sm text-white/70">Light fog</div>
          <div className="text-sm text-white/70">H:65° L:54°</div>
        </button>
        <div className="mt-6 rounded-2xl bg-white/10 p-4 text-left backdrop-blur">
          <div className="text-xs uppercase tracking-wide text-white/60">Hourly</div>
          <div className="mt-2 flex justify-between">
            {HOURS.map((h) => (
              <div key={h.t} className="text-center">
                <div className="text-xs text-white/60">{h.t}</div>
                <div className="mt-1 text-sm">{h.d}</div>
              </div>
            ))}
          </div>
        </div>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label htmlFor="wx-search" className="sr-only">Search location</label>
          <input
            id="wx-search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search location…"
            autoComplete="off"
            className="w-full rounded-xl bg-white/15 px-4 py-3.5 text-[16px] text-white outline-none placeholder:text-white/50 focus:ring-2 focus:ring-white/30"
          />
        </form>
        <button aria-label="margin" onClick={onMarginTripleTap} className="fixed bottom-0 right-0 h-24 w-24 touch-manipulation" style={{ WebkitTapHighlightColor: "transparent" }} />
        <span className="fixed bottom-2 left-3 select-none text-lg text-white opacity-[0.08]" aria-hidden>H</span>
      </div>
    </div>
  );
}
