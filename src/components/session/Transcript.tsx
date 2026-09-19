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
              <div className="max-w-[80vw] rounded-2xl rounded-br-md bg-[#2a2d36] px-4 py-2.5 text-[15px] text-stone-100 sm:max-w-md">
                {m.text}
              </div>
            </div>
          );
        }
        if (m.role === "haven") {
          // Quiet replies: small, grey, never bubbly.
          return (
            <div key={m.id} className="self-start">
              <p className="max-w-[85vw] text-[14px] leading-relaxed text-stone-400 sm:max-w-md">{m.text}</p>
            </div>
          );
        }
        if (m.role === "contact") {
          return (
            <div key={m.id} className="self-start">
              <div className={cn("max-w-[85vw] rounded-2xl rounded-bl-md border border-[#9db29a]/30 bg-[#9db29a]/10 px-4 py-2.5 text-[15px] text-[#cfe0cd] sm:max-w-md")}>
                <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-[#9db29a]">contact</span>
                {m.text}
              </div>
            </div>
          );
        }
        return (
          <p key={m.id} className="self-center rounded-full bg-white/5 px-3 py-1 text-center text-xs text-stone-500">
            {m.text}
          </p>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
