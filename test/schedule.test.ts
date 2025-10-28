import { describe, it, expect } from 'vitest';
import { buildDayDescriptions, I18N } from '../src/schedule';
import type { DailyWindow } from '../src/sunwindows';

const base: Omit<DailyWindow, 'anchors'> = {
  date: '2025-03-01',
  timezone: 'America/New_York',
  kind: 'morning',
  start: '2025-03-01T06:30:00-05:00',
  end: '2025-03-01T08:00:00-05:00',
  latitude: 40.7128,
  longitude: -74.0060,
};

describe('buildDayDescriptions', () => {
  it('produces text and HTML with expected keywords in English', () => {
    const w: DailyWindow = { ...base, anchors: {} } as any;
    const { text, html } = buildDayDescriptions(w, 'en');
    expect(text).toContain(I18N.en.segments.sunrise);
    expect(text).toContain(I18N.en.segments.sunset);
    expect(html).toContain('<table');
    expect(html).toContain('</table>');
  });

  it('localizes to Spanish', () => {
    const w: DailyWindow = { ...base, anchors: {} } as any;
    const { text } = buildDayDescriptions(w, 'es');
    expect(text).toContain(I18N.es.segments.sunrise);
    expect(text).toContain(I18N.es.segments.sunset);
  });
});


