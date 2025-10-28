import SunCalc from 'suncalc';
import tzLookup from 'tz-lookup';
import { DateTime } from 'luxon';

export type WindowKind = 'morning' | 'evening';

export interface DailyWindow {
  date: string; // YYYY-MM-DD (local)
  timezone: string; // IANA zone
  kind: WindowKind;
  start: string; // ISO in local time
  end: string; // ISO in local time
  latitude?: number;
  longitude?: number;
  anchors: {
    civilDawn?: string;
    sunrise?: string;
    goldenHourEnd?: string;
    goldenHourStart?: string;
    sunset?: string;
    civilDusk?: string;
  };
}

export interface ComputeParams {
  latitude: number;
  longitude: number;
  startDateUtc: DateTime; // day-start UTC
  endDateUtc: DateTime; // day-start UTC
  explicitZone?: string;
}

export async function computeDailyWindows(params: ComputeParams): Promise<DailyWindow[]> {
  const zone = params.explicitZone ?? tzLookup(params.latitude, params.longitude);
  const results: DailyWindow[] = [];

  for (
    let day = params.startDateUtc;
    day <= params.endDateUtc;
    day = day.plus({ days: 1 })
  ) {
    // Use the calendar date components from the provided UTC day,
    // but construct a local-zone datetime for calculations and labeling.
    const dateOnly = day.toFormat('yyyy-LL-dd');

    const noonLocal = DateTime.fromObject(
      {
        year: day.year,
        month: day.month,
        day: day.day,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      { zone }
    );

    // suncalc expects JS Date in system tz; we pass Date with epoch ms.
    const d = new Date(noonLocal.toMillis());
    const times = SunCalc.getTimes(d, params.latitude, params.longitude);

    const civilDawn = times.dawn; // start of civil twilight in morning
    const sunrise = times.sunrise;
    const civilDusk = times.dusk; // end of civil twilight in evening
    const sunset = times.sunset;
    const goldenStartEvening = (times as any).goldenHour; // evening start before sunset
    const goldenEndMorning = (times as any).goldenHourEnd; // morning end after sunrise

    function toLocalIso(dt?: Date): string | undefined {
      if (!dt) return undefined;
      return DateTime.fromMillis(dt.getTime(), { zone }).toISO({ suppressMilliseconds: true });
    }

    const anchors = {
      civilDawn: toLocalIso(civilDawn),
      sunrise: toLocalIso(sunrise),
      goldenHourEnd: toLocalIso(goldenEndMorning),
      goldenHourStart: toLocalIso(goldenStartEvening),
      sunset: toLocalIso(sunset),
      civilDusk: toLocalIso(civilDusk),
    };

    // Morning window: civilDawn -> goldenHourEnd
    if (civilDawn && goldenEndMorning && civilDawn < goldenEndMorning) {
      results.push({
        date: dateOnly,
        timezone: zone,
        kind: 'morning',
        start: anchors.civilDawn!,
        end: anchors.goldenHourEnd!,
        latitude: params.latitude,
        longitude: params.longitude,
        anchors,
      });
    }

    // Evening window: goldenHourStart -> civilDusk
    if (goldenStartEvening && civilDusk && goldenStartEvening < civilDusk) {
      results.push({
        date: dateOnly,
        timezone: zone,
        kind: 'evening',
        start: anchors.goldenHourStart!,
        end: anchors.civilDusk!,
        latitude: params.latitude,
        longitude: params.longitude,
        anchors,
      });
    }
  }

  return results;
}


