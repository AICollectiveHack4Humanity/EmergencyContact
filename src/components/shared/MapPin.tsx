export function MapPin({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-stone-300">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      <span>{label ?? "Unknown location"}</span>
    </span>
  );
}
