import { describe, it, expect } from 'vitest';
import { windowsToICS } from '../src/ics';
import type { DailyWindow } from '../src/sunwindows';

describe('windowsToICS', () => {
  it('generates a valid ICS skeleton with events', () => {
    const windows: DailyWindow[] = [
      {
        date: '2025-03-01',
        timezone: 'America/New_York',
        kind: 'morning',
        start: '2025-03-01T06:30:00-05:00',
        end: '2025-03-01T07:45:00-05:00',
        anchors: { sunrise: '2025-03-01T06:30:00-05:00' },
      },
      {
        date: '2025-03-01',
        timezone: 'America/New_York',
        kind: 'evening',
        start: '2025-03-01T17:45:00-05:00',
        end: '2025-03-01T18:20:00-05:00',
        anchors: { sunset: '2025-03-01T17:45:00-05:00' },
      },
    ];

    const ics = windowsToICS(windows);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(ics).toMatch(/SUMMARY:\d{2}:\d{2} (Sunrise|Sunset)/);
    expect(ics).toContain('DTSTART:');
    expect(ics).toContain('DTEND:');
  });
});


