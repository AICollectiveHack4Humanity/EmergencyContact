"use client";

import { useState } from "react";

/** Crisis actions: one primary (notify), two secondary. Briefing lives in the case file. */
export function ActionBar({
  onNotify,
  onSafe,
  onScript,
  onBrief,
  notifying,
}: {
  onNotify: () => void;
  onSafe: () => void;
  onScript: () => void;
  onBrief: () => void;
  notifying?: boolean;
}) {
  const [confirmNotify, setConfirmNotify] = useState(false);

  return (
    <div className="bg-white px-3 py-2">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        {confirmNotify ? (
          <span className="flex items-center gap-2">
            <button
              onClick={() => { setConfirmNotify(false); onNotify(); }}
              className="min-h-[44px] rounded-full bg-stone-900 px-4 text-sm font-semibold text-white"
            >
              {notifying ? "Sending…" : "Confirm notify"}
            </button>
            <button onClick={() => setConfirmNotify(false)} className="min-h-[44px] rounded-full border border-stone-300 px-4 text-sm text-stone-700">
              Cancel
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmNotify(true)} className="min-h-[44px] rounded-full border border-amber-800 px-4 text-sm font-medium text-amber-900">
            Notify contacts
          </button>
        )}
        <button onClick={onScript} className="min-h-[44px] rounded-full border border-stone-300 px-4 text-sm text-stone-800">
          Draft 911 script
        </button>
        <button onClick={onSafe} className="min-h-[44px] rounded-full border border-green-700 px-4 text-sm font-medium text-green-800">
          I&apos;m safe
        </button>
        <button onClick={onBrief} className="min-h-[44px] rounded-full border border-stone-300 px-4 text-sm text-stone-800">
          Case brief
        </button>
      </div>
    </div>
  );
}
