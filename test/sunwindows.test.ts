import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { computeDailyWindows } from '../src/sunwindows';

describe('computeDailyWindows', () => {
  it('produces morning and evening windows for NYC on a typical summer day', async () => {
    const windows = await computeDailyWindows({
      latitude: 40.7128,
      longitude: -74.0060,
      startDateUtc: DateTime.fromISO('2025-06-15', { zone: 'utc' }).startOf('day'),
      endDateUtc: DateTime.fromISO('2025-06-15', { zone: 'utc' }).startOf('day'),
    });

    expect(windows.length).toBeGreaterThanOrEqual(2);
    const kinds = new Set(windows.map((w) => w.kind));
    expect(kinds.has('morning')).toBe(true);
    expect(kinds.has('evening')).toBe(true);

    for (const w of windows) {
      expect(new Date(w.start).getTime()).toBeLessThan(new Date(w.end).getTime());
      expect(w.date).toBe('2025-06-15');
      expect(typeof w.timezone).toBe('string');
      expect(w.timezone.length).toBeGreaterThan(0);
    }
  });

  it('respects explicit timezone when provided', async () => {
    const windows = await computeDailyWindows({
      latitude: 40.7128,
      longitude: -74.0060,
      startDateUtc: DateTime.fromISO('2025-03-20', { zone: 'utc' }).startOf('day'),
      endDateUtc: DateTime.fromISO('2025-03-20', { zone: 'utc' }).startOf('day'),
      explicitZone: 'America/New_York',
    });
    for (const w of windows) {
      expect(w.timezone).toBe('America/New_York');
    }
  });
});


