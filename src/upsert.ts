import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { DateTime } from 'luxon';
import type { DailyWindow } from './sunwindows';

const DEFAULT_CALENDAR_NAME = process.env.CALENDAR_NAME || 'Golden/Blue Windows';

interface UpsertParams {
  oauth2Client: OAuth2Client;
  windows: DailyWindow[];
  calendarId?: string;
}

export async function upsertWindowsAsEvents({ oauth2Client, windows, calendarId }: UpsertParams) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const targetCalendarId = await ensureCalendar(calendar, calendarId);

  // Batch by day to reduce calls if needed; simple loop for now
  for (const w of windows) {
    const uid = `sunlight:${w.date}:${w.kind}`;
    const title = w.kind === 'morning' ? 'Blue → Golden hour (AM)' : 'Golden → Blue hour (PM)';
    const description = buildDescription(w);

    // Try find existing event by private extendedProperties; search in a wider window
    const timeMin = DateTime.fromISO(w.start).minus({ hours: 6 }).toISO();
    const timeMax = DateTime.fromISO(w.end).plus({ hours: 6 }).toISO();
    const existing = await calendar.events.list({
      calendarId: targetCalendarId,
      privateExtendedProperty: [`uid=${uid}`],
      timeMin,
      timeMax,
      singleEvents: true,
      maxResults: 5,
    });

    const eventBody = {
      summary: title,
      description,
      start: { dateTime: w.start, timeZone: w.timezone },
      end: { dateTime: w.end, timeZone: w.timezone },
      extendedProperties: { private: { uid } },
      reminders: { useDefault: true },
    } as const;

    if (existing.data.items && existing.data.items.length > 0) {
      const ev = existing.data.items[0]!;
      await calendar.events.update({
        calendarId: targetCalendarId,
        eventId: ev.id!,
        requestBody: eventBody,
      });
    } else {
      await calendar.events.insert({ calendarId: targetCalendarId, requestBody: eventBody });
    }
  }
}

function toRfc3339(iso: string): string {
  // Ensure RFC3339 with timezone offset
  return DateTime.fromISO(iso).toISO();
}

async function ensureCalendar(calendar: ReturnType<typeof google.calendar>, explicitId?: string): Promise<string> {
  if (explicitId) return explicitId;

  // Try find by summary
  const list = await calendar.calendarList.list({ maxResults: 250 });
  const found = list.data.items?.find((c) => c.summary === DEFAULT_CALENDAR_NAME);
  if (found?.id) return found.id;

  // Create
  const created = await calendar.calendars.insert({ requestBody: { summary: DEFAULT_CALENDAR_NAME } });
  // Add to calendar list to ensure visibility
  await calendar.calendarList.insert({ requestBody: { id: created.data.id! } });
  return created.data.id!;
}

export function buildDescription(w: DailyWindow): string {
  const lines = [
    `Date: ${w.date} (${w.timezone})`,
    `Start: ${w.start}`,
    `End:   ${w.end}`,
    '',
    'Anchors:',
    `- Civil dawn:   ${w.anchors.civilDawn ?? 'n/a'}`,
    `- Sunrise:      ${w.anchors.sunrise ?? 'n/a'}`,
    `- Golden end:   ${w.anchors.goldenHourEnd ?? 'n/a'}`,
    `- Golden start: ${w.anchors.goldenHourStart ?? 'n/a'}`,
    `- Sunset:       ${w.anchors.sunset ?? 'n/a'}`,
    `- Civil dusk:   ${w.anchors.civilDusk ?? 'n/a'}`,
  ];
  return lines.join('\n');
}


