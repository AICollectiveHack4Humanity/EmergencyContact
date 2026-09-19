"use client";

import { useRef, useState } from "react";
import type { GeoPoint } from "@/lib/types";
import { PinIcon, PhotoIcon } from "@/components/shared/icons";

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
    <div className="safe-bottom border-t border-stone-200 bg-white/95 p-3 backdrop-blur">
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
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-stone-300 text-stone-700 disabled:opacity-40"
        >
          <PinIcon />
        </button>
        <button
          aria-label="Send photo"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-stone-300 text-stone-700 disabled:opacity-40"
        >
          <PhotoIcon />
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
            className="min-h-[44px] flex-1 rounded-full border border-stone-300 bg-stone-100 px-4 text-[16px] text-stone-900 outline-none placeholder:text-stone-500 focus:border-amber-800"
          />
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="min-h-[44px] rounded-full bg-stone-900 px-5 font-medium text-white disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
