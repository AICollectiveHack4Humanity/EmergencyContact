function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "h-5 w-5"}
    >
      {children}
    </svg>
  );
}

export function CameraIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="m15 10 7-4v12l-7-4" />
    </Svg>
  );
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function PhotoIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 19 5-5 3 3 3-3 3 3" />
    </Svg>
  );
}

export function SlidersIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Svg>
  );
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </Svg>
  );
}

export function StopIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
    </Svg>
  );
}
