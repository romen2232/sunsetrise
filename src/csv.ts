import { DateTime } from 'luxon';
import type { DailyWindow } from './sunwindows';
import { buildDayDescriptions } from './schedule';

/*
Google Calendar CSV expected headers (English locale):
Subject, Start Date, Start Time, End Date, End Time, All Day Event, Description, Location, Private

Dates are typically in MM/DD/YYYY and 12-hour or 24-hour time depending on locale. We'll output ISO-like locale-agnostic by forcing MM/DD/YYYY and 24-hour HH:MM.
*/

export function windowsToGoogleCsv(windows: DailyWindow[]): string {
  const header = [
    'Subject',
    'Start Date',
    'Start Time',
    'End Date',
    'End Time',
    'All Day Event',
    'Description',
    'Location',
    'Private',
  ].join(',');

  const rows = windows.map((w) => {
    const start = DateTime.fromISO(w.start).setZone(w.timezone);
    const end = DateTime.fromISO(w.end).setZone(w.timezone);
    const title = w.kind === 'morning' ? 'Blue → Golden hour (AM)' : 'Golden → Blue hour (PM)';
    const { text } = buildDayDescriptions(w, 'en');
    const description = text;
    return [
      csvEscape(title),
      csvEscape(start.toFormat('MM/dd/yyyy')),
      csvEscape(start.toFormat('HH:mm')),
      csvEscape(end.toFormat('MM/dd/yyyy')),
      csvEscape(end.toFormat('HH:mm')),
      'False',
      csvEscape(description),
      '',
      'True',
    ].join(',');
  });

  return [header, ...rows].join('\n') + '\n';
}

export function buildCsvDescription(w: DailyWindow): string {
  const parts = [
    `Date ${w.date} (${w.timezone})`,
    `Start ${w.start}`,
    `End ${w.end}`,
  ];
  return parts.join(' | ');
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}


