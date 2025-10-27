import { describe, it, expect } from 'vitest';
import { buildDescription } from '../src/upsert';
import type { DailyWindow } from '../src/sunwindows';

describe('buildDescription', () => {
  it('formats description with anchors', () => {
    const w: DailyWindow = {
      date: '2025-01-10',
      timezone: 'America/New_York',
      kind: 'morning',
      start: '2025-01-10T06:45:00-05:00',
      end: '2025-01-10T08:00:00-05:00',
      anchors: {
        civilDawn: '2025-01-10T06:15:00-05:00',
        sunrise: '2025-01-10T07:15:00-05:00',
        goldenHourEnd: '2025-01-10T08:00:00-05:00',
        goldenHourStart: undefined,
        sunset: '2025-01-10T16:53:00-05:00',
        civilDusk: '2025-01-10T17:25:00-05:00',
      },
    };

    const desc = buildDescription(w);
    expect(desc).toContain('Anchors:');
    expect(desc).toContain('Civil dawn');
    expect(desc).toContain('Sunrise');
    expect(desc).toContain('Golden end');
    expect(desc).toContain('Civil dusk');
  });
});


