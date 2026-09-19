"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NotesShell } from "@/components/stealth/NotesShell";
import { WeatherShell } from "@/components/stealth/WeatherShell";

const PIN = process.env.NEXT_PUBLIC_DEMO_PIN ?? "2580";
const PASSPHRASE = (process.env.NEXT_PUBLIC_PASSPHRASE ?? "weather looks bad").toLowerCase();

export function StealthHome() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState("");
  const [skin, setSkin] = useState<"notes" | "weather">("notes");
  const taps = useRef<number[]>([]);
  const activated = useRef(false);

  const activate = useCallback(() => {
    if (activated.current) return;
    activated.current = true;
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 4000 });
      }
    } catch { /* fail soft */ }
    // Gentle fade: add class then navigate.
    document.body.style.transition = "opacity 0.45s ease";
    document.body.style.opacity = "0.25";
    setTimeout(() => {
      document.body.style.opacity = "1";
      router.push("/session");
    }, 320);
  }, [router]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("haven:skin");
      if (saved === "weather" || saved === "notes") setSkin(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (params.get("pin") === PIN) activate();
  }, [params, activate]);

  const submit = useCallback(() => {
    if (value.trim().toLowerCase() === PASSPHRASE || value.trim() === PIN) activate();
    else setValue("");
  }, [value, activate]);

  const marginTap = useCallback(() => {
    const now = Date.now();
    taps.current = [...taps.current, now].slice(-3);
    if (taps.current.length === 3 && now - taps.current[0] < 900) {
      taps.current = [];
      activate();
    }
    // reset window
    setTimeout(() => { taps.current = []; }, 1000);
  }, [activate]);

  const shell = { value, onChange: setValue, onSubmit: submit, onTitleHold: activate, onMarginTripleTap: marginTap };
  return skin === "notes" ? <NotesShell {...shell} /> : <WeatherShell {...shell} />;
}
