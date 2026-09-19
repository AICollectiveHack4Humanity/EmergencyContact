"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Incident } from "@/lib/types";

const FRAME_MS = 1000; // analyze one frame per second
const MAX_BACKOFF_MS = 30000;

interface LiveFrameResponse {
  incident: Incident;
  newObservations: number;
  escalated: boolean;
  llmError: string | null;
}

// Minimal Web Speech API typing (not in all TS DOM libs).
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition as new () => SpeechRecognitionLike) ??
    (w.webkitSpeechRecognition as new () => SpeechRecognitionLike) ?? null;
}

export function LiveFeed({
  incidentId,
  onIncident,
  onNotice,
}: {
  incidentId: string;
  onIncident: (incident: Incident) => void;
  onNotice: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalRef = useRef(FRAME_MS);
  const pendingSpeechRef = useRef("");
  const busyRef = useRef(false);
  const stoppedRef = useRef(false);

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState(0);
  const [facts, setFacts] = useState(0);
  const [heard, setHeard] = useState("");
  const [captionsLive, setCaptionsLive] = useState(false);
  const [slowed, setSlowed] = useState(false);

  const analyzeFrame = useCallback(async () => {
    if (stoppedRef.current || busyRef.current || document.hidden) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    busyRef.current = true;
    try {
      const scale = 480 / video.videoWidth;
      canvas.width = 480;
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      const transcript = pendingSpeechRef.current.trim();
      pendingSpeechRef.current = "";
      const res = await fetch("/api/session/live-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, imageDataUrl: dataUrl, transcript: transcript || undefined }),
      });
      if (res.status === 429) {
        // Free-tier quota: slow the loop instead of dying.
        intervalRef.current = Math.min(intervalRef.current * 2, MAX_BACKOFF_MS);
        setSlowed(true);
        restartTimer();
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        onNotice(`Live analysis paused: ${(j as { llmError?: string }).llmError ?? `HTTP ${res.status}`}`);
        stop();
        return;
      }
      const j = (await res.json()) as LiveFrameResponse;
      onIncident(j.incident);
      setFrames((n) => n + 1);
      if (j.newObservations > 0) {
        setFacts((n) => n + j.newObservations);
        onNotice(`Live feed: +${j.newObservations} new fact${j.newObservations > 1 ? "s" : ""} logged.`);
      }
      if (j.escalated) onNotice("Live feed noticed escalation — see transcript.");
      if (j.llmError) onNotice(`Live analysis note: ${j.llmError}`);
      if (intervalRef.current !== FRAME_MS) {
        intervalRef.current = FRAME_MS;
        setSlowed(false);
        restartTimer();
      }
    } catch {
      // Transient network blip: skip this frame, keep the loop alive.
    } finally {
      busyRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  const restartTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!stoppedRef.current) timerRef.current = setInterval(analyzeFrame, intervalRef.current);
  }, [analyzeFrame]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't access the camera. Upload a photo instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 } },
        audio: true,
      });
      streamRef.current = stream;
      stoppedRef.current = false;
      intervalRef.current = FRAME_MS;
      setSlowed(false);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      // Live captions via Web Speech API (Chrome/Edge). Absent on iOS Safari:
      // frames are still analyzed, captions just stay off.
      const SR = getSpeechRecognition();
      if (SR) {
        try {
          const rec = new SR();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = "en-US";
          rec.onresult = (ev) => {
            let interim = "";
            for (const r of Array.from(ev.results)) {
              if (r.isFinal) pendingSpeechRef.current += ` ${r[0].transcript}`;
              else interim += r[0].transcript;
            }
            setHeard((pendingSpeechRef.current + " " + interim).trim().slice(-220));
          };
          rec.onerror = () => {};
          rec.onend = () => {
            // Auto-restart captions unless the user stopped the feed.
            if (!stoppedRef.current) {
              try { rec.start(); } catch { /* ignore */ }
            }
          };
          rec.start();
          recognitionRef.current = rec;
          setCaptionsLive(true);
        } catch {
          setCaptionsLive(false);
        }
      } else {
        setCaptionsLive(false);
      }
      setActive(true);
      restartTimer();
    } catch {
      setError("Camera blocked. Allow camera access, or upload a photo instead.");
    }
  }, [restartTimer]);

  // video + canvas stay mounted (hidden) so refs exist when start() runs.
  return (
    <div>
      {!active ? (
        <div>
          <button
            onClick={start}
            className="min-h-[44px] rounded-full border border-[#d6c08a]/50 px-4 text-sm text-[#d6c08a]"
          >
            ● Live camera
          </button>
          {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
          <div className="flex items-start gap-3">
            <div className="relative w-28 shrink-0 overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} muted playsInline className="aspect-[3/4] w-full object-cover" aria-label="Live camera preview" />
              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-red-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" aria-hidden /> LIVE
              </span>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-stone-300">
                Frame {frames} · +{facts} facts{slowed && <span className="text-[#d6c08a]"> · slowed (quota)</span>}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {captionsLive ? "Listening + watching — facts populate live." : "Watching — live captions unavailable in this browser."}
              </p>
              {heard && <p className="mt-1.5 line-clamp-2 text-[13px] text-stone-400">Heard: “{heard}”</p>}
              <button onClick={stop} className="mt-2 min-h-[44px] rounded-full border border-white/15 px-4 text-sm text-stone-200">
                Stop camera
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mounted always (hidden when idle) so start() can attach the stream. */}
      {!active && <video ref={videoRef} muted playsInline className="hidden" aria-hidden />}
      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}
