"use client";

import { useRef, useState } from "react";
import type { GeoPoint } from "@/lib/types";

export function Composer({
  onText,
  onPhoto,
  onLocation,
  disabled,
}: {
  onText: (text: string) => void;
  onPhoto: (dataUrl: string) => void;
  onLocation: (loc?: GeoPoint) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border-t border-white/10 bg-[#17181c]/95 p-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <button
          aria-label="Share location"
          disabled={disabled}
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => onLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Shared location", at: new Date().toISOString() }),
                () => onLocation(undefined),
                { timeout: 5000 }
              );
            } else onLocation(undefined);
          }}
          className="min-h-[44px] min-w-[44px] rounded-full border border-white/15 px-3 text-lg text-stone-200 disabled:opacity-40"
        >
          ⌖
        </button>
        <button
          aria-label="Send photo"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          className="min-h-[44px] min-w-[44px] rounded-full border border-white/15 px-3 text-lg text-stone-200 disabled:opacity-40"
        >
          ◉
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => onPhoto(String(r.result));
            r.readAsDataURL(f);
            e.target.value = "";
          }}
        />
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t) return;
            onText(t);
            setText("");
          }}
        >
          <label htmlFor="composer" className="sr-only">Message</label>
          <input
            id="composer"
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type quietly…"
            autoComplete="off"
            className="min-h-[44px] flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-[16px] text-stone-100 outline-none placeholder:text-stone-500 focus:border-[#d6c08a]/50"
          />
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="min-h-[44px] rounded-full bg-[#d6c08a] px-5 font-medium text-[#17181c] disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
