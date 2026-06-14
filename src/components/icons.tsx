/**
 * Minimal monoline icons, drawn to sit alongside the typewriter wordmark.
 * They use `currentColor`, so color comes from the surrounding text class
 * (ink / paper / oxblood) — no emoji.
 */
type IconProps = { className?: string; size?: number };

function base(size = 20) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

/** Snooze — a plain clock face. */
export function ClockIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 1.75" />
    </svg>
  );
}

/** Done — a clean check. */
export function CheckIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 12.5 10 17.5 19 6.5" />
    </svg>
  );
}

/** Dismiss — a plain close mark ("not acting on this"). */
export function DismissIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Delete — a simple trash can. */
export function TrashIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5V4.5h5v2" />
      <path d="M6.5 6.5 7.5 20h9l1-13.5" />
      <path d="M10 10v6M14 10v6" />
    </svg>
  );
}

/** Action items — a checklist. */
export function ChecklistIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M4 6l1.5 1.5L8 5" />
      <path d="M4 12l1.5 1.5L8 11" />
      <path d="M4 18l1.5 1.5L8 17" />
      <path d="M11 6h9M11 12h9M11 18h9" />
    </svg>
  );
}

/** Calendar — a month grid. */
export function CalendarIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

/** Drafts — an envelope. */
export function MailIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M4 7.5l8 6 8-6" />
    </svg>
  );
}

/** FYI — an info mark. */
export function InfoIcon({ className, size }: IconProps) {
  return (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v4.5" />
      <path d="M12 7.9h.01" />
    </svg>
  );
}
