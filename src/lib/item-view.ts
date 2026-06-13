/**
 * Time-aware greeting in the user's timezone, addressing them by their
 * preferred name/title (falling back to their first name). Warm, never wordy.
 */
export function greeting(opts: {
  timezone: string;
  greetingName: string | null;
  name: string | null;
}): string {
  const tz = opts.timezone || "America/Denver";
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  const partOfDay =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const who =
    opts.greetingName?.trim() || opts.name?.trim().split(/\s+/)[0] || "";
  return who ? `Good ${partOfDay}, ${who}.` : `Good ${partOfDay}.`;
}

const PRIORITY_LABEL: Record<number, string> = {
  1: "Urgent",
  2: "Normal",
  3: "Low",
};

export function priorityLabel(priority: number): string {
  return PRIORITY_LABEL[priority] ?? "Normal";
}

export function ageLabel(firstSeen: Date): string {
  const days = Math.floor(
    (Date.now() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return "added today";
  if (days === 1) return "waiting 1 day";
  return `waiting ${days} days`;
}

export function deadlineLabel(deadline: Date | null): string | null {
  if (!deadline) return null;
  const days = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return `overdue ${Math.abs(days)}d`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days}d`;
}

/** Human-friendly "when" for a calendar candidate, in the user's timezone. */
export function calendarWhenLabel(opts: {
  start: Date | null;
  date: Date | null;
  timeTbd: boolean;
  timezone: string;
}): string | null {
  const tz = opts.timezone || "America/Denver";
  if (!opts.timeTbd && opts.start) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(opts.start);
  }
  // All-day: format in UTC so the stored midnight date doesn't shift a day back.
  const day = opts.date ?? opts.start;
  if (day) {
    const d = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(day);
    return `${d} · time TBD`;
  }
  return null;
}
