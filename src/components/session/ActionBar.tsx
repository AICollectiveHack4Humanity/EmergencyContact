"use client";

import { useState } from "react";

export function ActionBar({
  onNotify,
  onSafe,
  onBrief,
  onScript,
  notifying,
}: {
  onNotify: () => void;
  onSafe: () => void;
  onBrief: () => void;
  onScript: () => void;
  notifying?: boolean;
}) {
  const [confirmNotify, setConfirmNotify] = useState(false);

  return (
    <div className="border-b border-white/10 bg-[#17181c] px-3 py-2">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
        {confirmNotify ? (
          <span className="flex items-center gap-2">
            <button
              onClick={() => { setConfirmNotify(false); onNotify(); }}
              className="min-h-[44px] rounded-full bg-[#d6c08a] px-4 text-sm font-semibold text-[#17181c]"
            >
              {notifying ? "Sending…" : "Confirm notify"}
            </button>
            <button onClick={() => setConfirmNotify(false)} className="min-h-[44px] rounded-full border border-white/15 px-4 text-sm text-stone-300">
              Cancel
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmNotify(true)} className="min-h-[44px] rounded-full border border-[#d6c08a]/50 px-4 text-sm text-[#d6c08a]">
            Notify contacts
          </button>
        )}
        <button onClick={onScript} className="min-h-[44px] rounded-full border border-white/15 px-4 text-sm text-stone-200">
          Draft 911 script
        </button>
        <button onClick={onSafe} className="min-h-[44px] rounded-full border border-[#9db29a]/40 px-4 text-sm text-[#9db29a]">
          I&apos;m safe
        </button>
        <button onClick={onBrief} className="min-h-[44px] rounded-full border border-white/15 px-4 text-sm text-stone-200">
          Open briefing
        </button>
      </div>
    </div>
  );
}
