import { describe, it, expect } from 'vitest';
import { windowsToGoogleCsv } from '../src/csv';
import type { DailyWindow } from '../src/sunwindows';

describe('windowsToGoogleCsv', () => {
  it('produces CSV with header and rows', () => {
    const windows: DailyWindow[] = [
      {
        date: '2025-03-01',
        timezone: 'America/New_York',
        kind: 'morning',
        start: '2025-03-01T06:30:00-05:00',
        end: '2025-03-01T07:45:00-05:00',
        anchors: {},
      },
      {
        date: '2025-03-01',
        timezone: 'America/New_York',
        kind: 'evening',
        start: '2025-03-01T17:45:00-05:00',
        end: '2025-03-01T18:20:00-05:00',
        anchors: {},
      },
    ];

    const csv = windowsToGoogleCsv(windows);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('Subject,Start Date,Start Time,End Date,End Time');
    // We now include multiline descriptions; ensure at least 2 data rows exist.
    const dataRows = lines.filter((l, idx) => idx > 0 && !l.startsWith('Subject'));
    expect(dataRows.length).toBeGreaterThanOrEqual(2);
    expect(csv).toContain('Blue → Golden hour (AM)');
    expect(csv).toContain('Golden → Blue hour (PM)');
  });
});


