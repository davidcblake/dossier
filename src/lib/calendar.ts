import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { authForUser } from "@/lib/google-auth";

export async function calendarForUser(
  userId: string
): Promise<calendar_v3.Calendar> {
  return google.calendar({ version: "v3", auth: await authForUser(userId) });
}

export interface CalendarChoice {
  id: string;
  summary: string;
  primary: boolean;
}

/** List the user's writable calendars (for the settings picker). */
export async function listCalendars(
  userId: string
): Promise<CalendarChoice[]> {
  const cal = await calendarForUser(userId);
  const res = await cal.calendarList.list({ minAccessRole: "writer" });
  return (res.data.items ?? []).map((c) => ({
    id: c.id ?? "",
    summary: c.summary ?? c.id ?? "(unnamed)",
    primary: Boolean(c.primary),
  }));
}

export interface AddEventArgs {
  calendarId: string;
  title: string;
  /** ISO datetime; when omitted an all-day event is created for `date`. */
  start?: string | null;
  end?: string | null;
  date?: string | null; // YYYY-MM-DD for all-day (timeTbd)
  location?: string | null;
  timeTbd?: boolean;
}

/**
 * Insert an event on the user's chosen calendar. timeTbd → all-day placeholder.
 * Always adds a 60-minute popup reminder. Returns the created event id.
 * Never modifies or deletes events Dossier didn't create.
 */
export async function addEvent(
  userId: string,
  args: AddEventArgs
): Promise<string> {
  const cal = await calendarForUser(userId);

  const requestBody: calendar_v3.Schema$Event = {
    summary: args.title,
    location: args.location ?? undefined,
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 60 }],
    },
  };

  if (args.timeTbd || (!args.start && args.date)) {
    const startDay = (args.date ?? new Date().toISOString().slice(0, 10)).slice(
      0,
      10
    );
    // Google all-day events use an EXCLUSIVE end date → next day for a 1-day event.
    const endDay = new Date(`${startDay}T00:00:00Z`);
    endDay.setUTCDate(endDay.getUTCDate() + 1);
    requestBody.start = { date: startDay };
    requestBody.end = { date: endDay.toISOString().slice(0, 10) };
  } else {
    const start = args.start ?? new Date().toISOString();
    const end =
      args.end ?? new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
    requestBody.start = { dateTime: start };
    requestBody.end = { dateTime: end };
  }

  const res = await cal.events.insert({
    calendarId: args.calendarId,
    requestBody,
  });
  const id = res.data.id;
  if (!id) throw new Error("Calendar did not return an event id");
  return id;
}

/**
 * Delete an event Dossier created (only ever called with an eventId we stored).
 * Tolerates already-deleted events.
 */
export async function deleteEvent(
  userId: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const cal = await calendarForUser(userId);
  try {
    await cal.events.delete({ calendarId, eventId });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code !== 404 && code !== 410) throw err; // already gone is fine
  }
}
