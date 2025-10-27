import { Command } from 'commander';
import { DateTime } from 'luxon';
import { computeDailyWindows } from './sunwindows';
import { getOAuthClient } from './oauth';
import { upsertWindowsAsEvents } from './upsert';
import { windowsToGoogleCsv } from './csv';

const program = new Command();

program
  .name('sunsetrise')
  .description('Create Google Calendar events for golden/blue hour windows')
  .requiredOption('--lat <number>', 'Latitude', parseFloat)
  .requiredOption('--lon <number>', 'Longitude', parseFloat)
  .option('--start <date>', 'Inclusive start date (YYYY-MM-DD), default today')
  .requiredOption('--until <date>', 'Inclusive end date (YYYY-MM-DD)')
  .option('--calendarId <id>', 'Target Google Calendar ID (default: create/find named "Golden/Blue Windows")')
  .option('--tz <iana>', 'IANA timezone; default inferred from lat/lon')
  .option('--export-csv <path>', 'Write Google Calendar importable CSV to path and exit')
  .option('--dry-run', 'Do not call Google API, just print windows', false)
  .parse(process.argv);

async function main() {
  const opts = program.opts<{
    lat: number;
    lon: number;
    start?: string;
    until: string;
    calendarId?: string;
    tz?: string;
    dryRun?: boolean;
    exportCsv?: string;
  }>();

  const start = opts.start
    ? DateTime.fromISO(opts.start, { zone: 'utc' }).startOf('day')
    : DateTime.utc().startOf('day');
  const until = DateTime.fromISO(opts.until, { zone: 'utc' }).startOf('day');
  if (!until.isValid || (!start.isValid)) {
    throw new Error('Invalid start/until date. Use YYYY-MM-DD.');
  }
  if (until < start) {
    throw new Error('until must be on or after start');
  }

  const windows = await computeDailyWindows({
    latitude: opts.lat,
    longitude: opts.lon,
    startDateUtc: start,
    endDateUtc: until,
    explicitZone: opts.tz,
  });

  if (opts.dryRun) {
    for (const w of windows) {
      // eslint-disable-next-line no-console
      console.log(`${w.date} | ${w.kind} | ${w.start} -> ${w.end} (${w.timezone})`);
    }
    return;
  }

  if (opts.exportCsv) {
    const csv = windowsToGoogleCsv(windows);
    if (opts.exportCsv === '-') {
      // Write to stdout
      process.stdout.write(csv);
    } else {
      const fs = await import('fs/promises');
      await fs.writeFile(opts.exportCsv, csv, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`CSV written to ${opts.exportCsv}`);
    }
    return;
  }

  const oauth2Client = await getOAuthClient();
  await upsertWindowsAsEvents({
    oauth2Client,
    windows,
    calendarId: opts.calendarId,
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


