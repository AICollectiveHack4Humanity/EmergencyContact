import { PinIcon } from "./icons";

export function MapPin({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-stone-600">
      <PinIcon className="h-3.5 w-3.5" />
      <span>{label ?? "Unknown location"}</span>
    </span>
  );
}
