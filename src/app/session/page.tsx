"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeoPoint, Incident } from "@/lib/types";
import { Transcript } from "@/components/session/Transcript";
import { Composer } from "@/components/session/Composer";
import { FactRail } from "@/components/session/FactRail";
import { ActionBar } from "@/components/session/ActionBar";
import { LiveFeed } from "@/components/session/LiveFeed";
import { StatusPill } from "@/components/shared/StatusPill";
import { MapPin } from "@/components/shared/MapPin";
import { SlidersIcon } from "@/components/shared/icons";
import { CaseGraphSection } from "@/components/session/CaseGraphSection";
import { lastLocationLabel } from "@/lib/geo";

const DEFAULT_PIN: GeoPoint = { lat: 37.7897, lng: -122.3972, label: "SoMa, San Francisco", at: new Date().toISOString() };

export default function SessionPage() {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);

  // Start (or resume) a session on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedId = localStorage.getItem("haven:incidentId");
        if (savedId) {
          const r = await fetch(`/api/session/${savedId}`);
          if (r.ok) {
            const j = await r.json();
            if (!cancelled && j.incident) {
              setIncident(j.incident);
              setLoading(false);
              return;
            }
          }
        }
        const r = await fetch("/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userName: "Maya", type: "silent_safety", speakFreely: false, location: DEFAULT_PIN }),
        });
        const j = await r.json();
        if (!cancelled) {
          setIncident(j.incident);
          try { localStorage.setItem("haven:incidentId", j.incident.id); } catch { /* ignore */ }
        }
      } catch {
        if (!cancelled) setToast("Couldn't start session. Check connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Live location watch (fails soft).
  useEffect(() => {
    if (!incident || typeof navigator === "undefined" || !navigator.geolocation) return;
    let watch = -1;
    try {
      watch = navigator.geolocation.watchPosition(
        (pos) => {
          setIncident((prev) => {
            if (!prev) return prev;
            const last = prev.locations[prev.locations.length - 1];
            if (last && Math.abs(last.lat - pos.coords.latitude) < 0.0002 && Math.abs(last.lng - pos.coords.longitude) < 0.0002) return prev;
            return { ...prev, locations: [...prev.locations, { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Live pin", at: new Date().toISOString() }] };
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 8000 }
      );
    } catch { /* denied */ }
    return () => { try { if (watch >= 0) navigator.geolocation.clearWatch(watch); } catch { /* ignore */ } };
  }, [incident?.id]);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 3200);
  };

  const sendText = useCallback(async (text: string, loc?: GeoPoint) => {
    if (!incident || sending) return;
    setSending(true);
    // Optimistic user bubble.
    const optimistic: Incident = { ...incident, messages: [...incident.messages, { id: `tmp_${Date.now()}`, role: "user" as const, text, at: new Date().toISOString() }] };
    setIncident(optimistic);
    try {
      const r = await fetch("/api/session/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, text, location: loc }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "send failed");
      setIncident(j.incident);
      if (j.llmFallback) showToast(`LLM fallback${j.llmError ? `: ${j.llmError}` : ""}`);
    } catch {
      showToast("Message didn't send — try again.");
      setIncident(incident);
    } finally {
      setSending(false);
    }
  }, [incident, sending]);

  const sendPhoto = useCallback(async (dataUrl: string) => {
    if (!incident) return;
    try {
      const r = await fetch("/api/session/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, imageDataUrl: dataUrl }),
      });
      const j = await r.json();
      if (r.ok) setIncident(j.incident);
      else showToast("Photo upload failed.");
    } catch {
      showToast("Photo upload failed.");
    }
  }, [incident]);

  const notify = useCallback(async () => {
    if (!incident || notifying) return;
    setNotifying(true);
    try {
      const r = await fetch("/api/actions/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : "notify failed");
      setIncident(j.incident);
      showToast(`Notified via ${j.via === "live" ? "iMessage" : "mock outbox"}.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Notify failed.");
    } finally {
      setNotifying(false);
    }
  }, [incident, notifying]);

  const markSafe = useCallback(async () => {
    if (!incident) return;
    const r = await fetch(`/api/session/${incident.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "safe", allClear: true }),
    });
    const j = await r.json();
    if (r.ok) {
      setIncident(j.incident);
      showToast("Marked safe. All-clear noted.");
    }
  }, [incident]);

  const draftScript = useCallback(() => {
    if (!incident) return;
    const loc = incident.locations[incident.locations.length - 1];
    const locName = loc?.label ?? "my current location";
    const coords = loc ? loc.lat.toFixed(4) + ", " + loc.lng.toFixed(4) : "unknown";
    const talk = incident.speakFreely ? "I can talk." : "I may not be able to speak freely.";
    const who = incident.user?.name ?? "calling";
    setScript(
      "911 SCRIPT (read only if safe — Haven never auto-calls):\n" +
        '"Hi, I need help at ' + locName + " (" + coords + "). I'm " + who + "; " + talk + " " + incident.summary + '"\n\nConfirm out loud before dialing.'
    );
  }, [incident]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-100">
        <p className="text-sm text-stone-500">Opening…</p>
      </div>
    );
  }
  if (!incident) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-100 p-6 text-center">
        <p className="text-sm text-stone-600">No session. <a className="underline" href="/">Go back</a> or <a className="underline" href="/settings">open settings</a>.</p>
      </div>
    );
  }

  return (
    <div className="fade-in flex min-h-dvh flex-col bg-stone-100 text-stone-900">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl tracking-tight text-amber-900">Haven</span>
            <StatusPill urgency={incident.urgency} status={incident.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => document.getElementById("live-camera")?.scrollIntoView({ behavior: "smooth" })}
              title="Jump to the live camera feed"
              className="flex min-h-[44px] items-center gap-2 rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-800"
            >
              <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden />
              Live
            </button>
            <a href="/settings" aria-label="Settings" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-stone-300 px-3 py-2 text-stone-700">
              <SlidersIcon />
            </a>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-2">
          <MapPin label={`Last location · ${lastLocationLabel(incident.locations)}`} />
        </div>
        <div className="hidden md:block">
          <ActionBar onNotify={notify} onSafe={markSafe} onScript={draftScript} onBrief={() => { if (incident) window.location.href = `/brief/${incident.id}`; }} notifying={notifying} />
        </div>
      </header>

      <section aria-label="Live camera" id="live-camera" className="border-b border-stone-200 bg-white scroll-mt-32">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h2 className="text-lg font-semibold text-stone-900">Live camera</h2>
          <p className="mt-0.5 text-sm text-stone-600">
            Frames and captions analyzed every second; new facts land below.
          </p>
          <div className="mt-3">
            <LiveFeed incidentId={incident.id} onIncident={setIncident} onNotice={showToast} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-0 md:px-4 md:py-4">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white md:rounded-2xl md:border md:border-stone-200">
          <div className="max-h-[55dvh] flex-1 overflow-y-auto md:max-h-none">
            <Transcript messages={incident.messages} />
          </div>
          <button
            onClick={() => setSheetOpen((v) => !v)}
            className="border-t border-stone-200 px-4 py-3 text-left text-sm font-medium text-stone-800 md:hidden"
            aria-expanded={sheetOpen}
          >
            Case file · {incident.observations.length} {sheetOpen ? "▾" : "▴"}
          </button>
          {sheetOpen && (
            <div className="max-h-96 overflow-y-auto border-t border-stone-200 md:hidden">
              <CaseGraphSection incident={incident} />
              <div className="border-t border-stone-200">
                <FactRail incident={incident} />
              </div>
            </div>
          )}
        </main>
        <aside className="hidden w-80 shrink-0 flex-col gap-6 overflow-y-auto md:flex">
          <div className="rounded-2xl border border-stone-200 bg-white">
            <CaseGraphSection incident={incident} />
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white">
            <FactRail incident={incident} />
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30">
        <div className="border-t border-stone-200 md:hidden">
          <ActionBar onNotify={notify} onSafe={markSafe} onScript={draftScript} onBrief={() => { if (incident) window.location.href = `/brief/${incident.id}`; }} notifying={notifying} />
        </div>
        <Composer
          disabled={sending}
          onText={(t) => sendText(t)}
          onPhoto={sendPhoto}
          onLocation={(l) => sendText(l ? `[location shared: ${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}]` : "[location unavailable]", l)}
        />
      </div>

      {script && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-label="911 script">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="font-serif text-lg text-amber-900">Draft 911 script</h2>
            <p className="mt-1 text-xs text-stone-600">Requires your explicit confirm. Haven never dials automatically.</p>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-100 p-3 text-sm text-stone-900">{script}</pre>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(script).catch(() => {}); showToast("Script copied."); }} className="min-h-[44px] flex-1 rounded-full bg-stone-900 text-sm font-semibold text-white">Copy</button>
              <button onClick={() => setScript(null)} className="min-h-[44px] flex-1 rounded-full border border-stone-300 text-sm text-stone-800">Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-36 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg md:bottom-24" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
