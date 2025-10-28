import { DateTime } from 'luxon';
import SunCalc from 'suncalc';
import type { DailyWindow } from './sunwindows';

type Lang = 'en' | 'es';

const I18N: Record<Lang, {
  header: { desc: string; time: string; dur: string };
  segments: {
    astro: string; nautical: string; civil: string;
    sunrise: string; golden: string; noon: string; sunset: string;
  };
  titles: { sunrise: string; sunset: string };
}> = {
  en: {
    header: { desc: 'Description', time: 'HH:MM', dur: 'Duration' },
    segments: {
      astro: 'Astronomical twilight',
      nautical: 'Nautical twilight',
      civil: 'Civil twilight',
      sunrise: 'Sunrise',
      golden: 'Golden hour',
      noon: 'Solar noon',
      sunset: 'Sunset',
    },
    titles: { sunrise: 'Sunrise', sunset: 'Sunset' },
  },
  es: {
    header: { desc: 'Descripción', time: 'HH:MM', dur: 'Duración' },
    segments: {
      astro: 'Crepúsculo astronómico',
      nautical: 'Crepúsculo náutico',
      civil: 'Crepúsculo civil',
      sunrise: 'Amanecer',
      golden: 'La hora dorada',
      noon: 'Cenit',
      sunset: 'Atardecer',
    },
    titles: { sunrise: 'Amanecer', sunset: 'Atardecer' },
  },
};

function label(kind: 'morning' | 'evening', lang: Lang): string {
  return kind === 'morning' ? I18N[lang].titles.sunrise : I18N[lang].titles.sunset;
}

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
  opts?: { lang?: Lang; icsColors?: { sunrise?: string; sunset?: string } }
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
    // Categories and color (RFC 7986 COLOR). Some clients may ignore COLOR; harmless if unsupported.
    const cat = w.kind === 'morning' ? label('morning', lang) : label('evening', lang);
    lines.push(foldLine(`CATEGORIES:${escapeText(cat)}`));
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

function fmt(dtIso?: string, zone?: string): string | undefined {
  if (!dtIso) return undefined;
  return DateTime.fromISO(dtIso).setZone(zone ?? 'utc').toFormat('HH:mm');
}

function fmtRange(a?: string, b?: string, zone?: string): { text?: string; minutes?: number } {
  if (!a || !b) return {};
  const da = DateTime.fromISO(a).setZone(zone ?? 'utc');
  const db = DateTime.fromISO(b).setZone(zone ?? 'utc');
  if (!da.isValid || !db.isValid || db <= da) return {};
  const minutes = Math.round(db.diff(da, 'minutes').as('minutes'));
  return { text: `${da.toFormat('HH:mm')} - ${db.toFormat('HH:mm')}`, minutes };
}

function buildDayDescriptions(w: DailyWindow, lang: Lang): { text: string; html: string } {
  const zone = w.timezone;
  let textLines: string[] = [];
  let htmlRows: string[] = [];

  try {
    if (!w.latitude || !w.longitude) throw new Error('missing coords');
    const day = DateTime.fromISO(`${w.date}T12:00:00`, { zone });
    const d = new Date(day.toMillis());
    const t = SunCalc.getTimes(d, w.latitude, w.longitude);

    const L = I18N[lang].segments;

    const segs: Array<{ label: string; range?: string; minutes?: number; point?: string; bold?: boolean }> = [];

    const rAstroM = fmtRange(t.nightEnd?.toISOString(), t.nauticalDawn?.toISOString(), zone);
    if (rAstroM.text) segs.push({ label: L.astro, range: rAstroM.text, minutes: rAstroM.minutes });

    const rNautM = fmtRange(t.nauticalDawn?.toISOString(), t.dawn?.toISOString(), zone);
    if (rNautM.text) segs.push({ label: L.nautical, range: rNautM.text, minutes: rNautM.minutes });

    const rCivilM = fmtRange(t.dawn?.toISOString(), t.sunrise?.toISOString(), zone);
    if (rCivilM.text) segs.push({ label: L.civil, range: rCivilM.text, minutes: rCivilM.minutes });

    const sunrisePoint = fmt(t.sunrise?.toISOString(), zone);
    if (sunrisePoint) segs.push({ label: L.sunrise, point: sunrisePoint, bold: true });

    const rGoldenM = fmtRange(t.sunrise?.toISOString(), (t as any).goldenHourEnd?.toISOString?.(), zone);
    if (rGoldenM.text) segs.push({ label: L.golden, range: rGoldenM.text, minutes: rGoldenM.minutes });

    const noonPoint = fmt(t.solarNoon?.toISOString(), zone);
    if (noonPoint) segs.push({ label: L.noon, point: noonPoint });

    const rGoldenE = fmtRange((t as any).goldenHour?.toISOString?.(), t.sunset?.toISOString(), zone);
    if (rGoldenE.text) segs.push({ label: L.golden, range: rGoldenE.text, minutes: rGoldenE.minutes });

    const sunsetPoint = fmt(t.sunset?.toISOString(), zone);
    if (sunsetPoint) segs.push({ label: L.sunset, point: sunsetPoint, bold: true });

    const rCivilE = fmtRange(t.sunset?.toISOString(), t.dusk?.toISOString(), zone);
    if (rCivilE.text) segs.push({ label: L.civil, range: rCivilE.text, minutes: rCivilE.minutes });

    const rNautE = fmtRange(t.dusk?.toISOString(), t.nauticalDusk?.toISOString(), zone);
    if (rNautE.text) segs.push({ label: L.nautical, range: rNautE.text, minutes: rNautE.minutes });

    const rAstroE = fmtRange(t.nauticalDusk?.toISOString(), t.night?.toISOString(), zone);
    if (rAstroE.text) segs.push({ label: L.astro, range: rAstroE.text, minutes: rAstroE.minutes });

    // Build row data first to compute dynamic widths
    type Row = { type: 'row' | 'spacer'; label?: string; time?: string; dur?: string; bold?: boolean };
    const rows: Row[] = [];

    let addedMorningGolden = false;
    let addedNoon = false;

    for (const s of segs) {
      if (s.range) {
        rows.push({ type: 'row', label: s.label, time: s.range, dur: s.minutes ? `${s.minutes} min.` : '', bold: s.bold });
        if (!addedMorningGolden && s.label === L.golden) {
          addedMorningGolden = true;
          rows.push({ type: 'spacer' });
        }
      } else if (s.point) {
        rows.push({ type: 'row', label: s.label, time: s.point, dur: '', bold: s.bold });
        if (s.label === L.noon) {
          addedNoon = true;
          rows.push({ type: 'spacer' });
        }
      }
    }

    // No header; output rows as: TIME_RANGE  DURATION DESCRIPTION

    for (const r of rows) {
      if (r.type === 'spacer') {
        textLines.push('');
        htmlRows.push('<tr><td colspan="3">&nbsp;</td></tr>');
      } else {
        const labelTxt = r.label || '';
        const timeTxt = r.time || '';
        const durTxt = r.dur || '';
        // Text: time first, then duration, then description
        const timeOut = timeTxt;
        const durOut = durTxt;
        const descOut = labelTxt;
        const parts = [timeOut];
        if (durOut) parts.push(durOut);
        parts.push(descOut);
        textLines.push(parts.join('  '));
        const safeLabel = escapeHtml(descOut);
        const lbl = r.bold ? `<b>${safeLabel}</b>` : safeLabel;
        htmlRows.push(`<tr><td>${escapeHtml(timeOut)}</td><td>${escapeHtml(durOut)}</td><td>${lbl}</td></tr>`);
      }
    }
  } catch {
    // Fallback minimal description
    const labelTitle = lang === 'es' ? 'Ventana' : 'Window';
    textLines = [
      `${labelTitle}: ${w.kind}`,
      `Start: ${w.start}`,
      `End: ${w.end}`,
    ];
    htmlRows = textLines
      .map((l) => l.length ? l : '&nbsp;')
      .map((l) => `<tr><td colspan="3">${escapeHtml(l)}</td></tr>`);
  }

  const text = textLines.join('\n');
  const html = `<table border="0" cellpadding="2" cellspacing="0">${htmlRows.join('')}</table>`;
  return { text, html };
}



function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


