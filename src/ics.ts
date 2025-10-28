import { DateTime } from 'luxon';
import type { DailyWindow } from './sunwindows';
import { buildDayDescriptions, label } from './schedule';
import type { Lang } from './schedule';

function formatUtc(dtIso: string): string {
  const dt = DateTime.fromISO(dtIso).toUTC();
  return dt.toFormat("yyyyLLdd'T'HHmmss'Z'");
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldLine(line: string): string {
  // Basic folding at 75 chars with a leading space on continuation
  const limit = 75;
  if (line.length <= limit) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + limit);
    parts.push(i === 0 ? chunk : ' ' + chunk);
    i += limit;
  }
  return parts.join('\r\n');
}

export function windowsToICS(
  windows: DailyWindow[],
  opts?: { lang?: Lang }
): string {
  const lang: Lang = opts?.lang ?? 'en';
  const now = DateTime.utc().toFormat("yyyyLLdd'T'HHmmss'Z'");
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('PRODID:-//sunsetrise//EN');
  lines.push('VERSION:2.0');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push('X-WR-CALNAME:Golden/Blue Windows');
  lines.push('X-WR-TIMEZONE:UTC');

  // Provide a minimal UTC VTIMEZONE for compatibility
  lines.push('BEGIN:VTIMEZONE');
  lines.push('TZID:UTC');
  lines.push('X-LIC-LOCATION:UTC');
  lines.push('BEGIN:STANDARD');
  lines.push('TZOFFSETFROM:+0000');
  lines.push('TZOFFSETTO:+0000');
  lines.push('TZNAME:UTC');
  lines.push('DTSTART:19700101T000000');
  lines.push('END:STANDARD');
  lines.push('END:VTIMEZONE');

  for (const w of windows) {
    const uid = `sunlight:${w.date}:${w.kind}@sunsetrise`;
    const anchorIso = w.kind === 'morning' ? w.anchors.sunrise : w.anchors.sunset;
    const timeLabel = anchorIso
      ? DateTime.fromISO(anchorIso).setZone(w.timezone).toFormat('HH:mm')
      : '';
    const summary = `${timeLabel ? timeLabel + ' ' : ''}${label(w.kind, lang)}`;
    const { text: description, html: descriptionHtml } = buildDayDescriptions(w, lang);
    const dtStart = formatUtc(w.start);
    const dtEnd = formatUtc(w.end);

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(foldLine(`SUMMARY:${escapeText(summary)}`));
    lines.push(foldLine(`DESCRIPTION:${escapeText(description)}`));
    // HTML alternative without escaping tags to allow bold/table rendering
    lines.push(foldLine(`X-ALT-DESC;FMTTYPE=text/html:${descriptionHtml}`));
    // Categories for grouping
    const cat = w.kind === 'morning' ? label('morning', lang) : label('evening', lang);
    lines.push(foldLine(`CATEGORIES:${escapeText(cat)}`));
    // Alarms: Sunrise at start; Sunset 15 minutes before start
    if (w.kind === 'morning') {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Sunrise');
      lines.push('TRIGGER:PT0M');
      lines.push('END:VALARM');
    } else {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Sunset');
      lines.push('TRIGGER:-PT15M');
      lines.push('END:VALARM');
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
