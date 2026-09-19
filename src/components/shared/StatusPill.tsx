import type { Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  low: "bg-stone-500/20 text-stone-300 border-stone-500/30",
  medium: "bg-[#9db29a]/15 text-[#9db29a] border-[#9db29a]/30",
  high: "bg-[#d6c08a]/15 text-[#d6c08a] border-[#d6c08a]/40",
  critical: "bg-red-500/15 text-red-300 border-red-400/40",
};

export function StatusPill({ urgency, status, fallback }: { urgency?: Urgency; status?: string; fallback?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {urgency && (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[urgency])}>
          {urgency}
        </span>
      )}
      {status && (
        <span className="inline-flex items-center rounded-full border border-stone-500/30 bg-stone-500/15 px-2.5 py-0.5 text-xs text-stone-300">
          {status.replace("_", " ")}
        </span>
      )}
      {fallback && (
        <span className="inline-flex items-center rounded-full border border-yellow-500/40 bg-yellow-500/15 px-2.5 py-0.5 text-xs text-yellow-200">
          graph fallback
        </span>
      )}
    </span>
  );
}
