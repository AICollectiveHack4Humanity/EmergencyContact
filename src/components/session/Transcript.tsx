"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Transcript({ messages }: { messages: Message[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-2 px-4 py-4" aria-label="Conversation">
      {messages.map((m) => {
        if (m.role === "user") {
          return (
            <div key={m.id} className="self-end">
              <div className="max-w-[80vw] rounded-2xl rounded-br-md border border-stone-200 bg-white px-4 py-2.5 text-[15px] text-stone-900 shadow-sm sm:max-w-md">
                {m.text}
              </div>
            </div>
          );
        }
        if (m.role === "haven") {
          // Quiet replies: small, gray, never bubbly.
          return (
            <div key={m.id} className="self-start">
              <p className="max-w-[85vw] text-[14px] leading-relaxed text-stone-600 sm:max-w-md">{m.text}</p>
            </div>
          );
        }
        if (m.role === "contact") {
          return (
            <div key={m.id} className="self-start">
              <div className={cn("max-w-[85vw] rounded-2xl rounded-bl-md border border-green-300 bg-green-50 px-4 py-2.5 text-[15px] text-green-950 sm:max-w-md")}>
                <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-green-800">contact</span>
                {m.text}
              </div>
            </div>
          );
        }
        return (
          <p key={m.id} className="self-center rounded-full bg-stone-200 px-3 py-1 text-center text-xs text-stone-600">
            {m.text}
          </p>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
