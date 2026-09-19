import type { Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";

// Solid pastel pills with dark text: legible on light and dark surfaces alike.
const styles: Record<string, string> = {
  low: "bg-stone-200 text-stone-700",
  medium: "bg-green-100 text-green-900",
  high: "bg-amber-100 text-amber-900",
  critical: "bg-red-100 text-red-800",
};

export function StatusPill({ urgency, status, fallback }: { urgency?: Urgency; status?: string; fallback?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {urgency && (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[urgency])}>
          {urgency}
        </span>
      )}
      {status && (
        <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-600">
          {status.replace("_", " ")}
        </span>
      )}
      {fallback && (
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
          graph fallback
        </span>
      )}
    </span>
  );
}
