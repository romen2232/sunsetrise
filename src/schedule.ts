import { DateTime } from 'luxon';
import SunCalc from 'suncalc';
import type { DailyWindow } from './sunwindows';
import { I18N } from './i18n';

export type Lang = 'en' | 'es';

export function label(kind: 'morning' | 'evening', lang: Lang): string {
  return kind === 'morning' ? I18N[lang].titles.sunrise : I18N[lang].titles.sunset;
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

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildDayDescriptions(w: DailyWindow, lang: Lang): { text: string; html: string } {
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

    // Build rows with grouping and spacer rows
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

    // Plain text: "TIME  DURATION  DESCRIPTION"
    for (const r of rows) {
      if (r.type === 'spacer') {
        textLines.push('');
        htmlRows.push('<tr><td colspan="3">&nbsp;</td></tr>');
      } else {
        const parts = [r.time || ''];
        if (r.dur) parts.push(r.dur);
        parts.push(r.label || '');
        textLines.push(parts.join('  '));
        const safeLabel = escapeHtml(r.label || '');
        const lbl = r.bold ? `<b>${safeLabel}</b>` : safeLabel;
        htmlRows.push(`<tr><td>${escapeHtml(r.time || '')}</td><td>${escapeHtml(r.dur || '')}</td><td>${lbl}</td></tr>`);
      }
    }
  } catch {
    const title = lang === 'es' ? 'Ventana' : 'Window';
    textLines = [
      `${title}: ${w.kind}`,
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


