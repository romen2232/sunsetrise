import { Command } from 'commander';
import { DateTime } from 'luxon';
import { computeDailyWindows } from './sunwindows';
import { windowsToGoogleCsv } from './csv';
import { windowsToICS } from './ics';

const program = new Command();

program
  .name('sunsetrise')
  .description('Create Google Calendar events for golden/blue hour windows')
  .requiredOption('--lat <number>', 'Latitude', parseFloat)
  .requiredOption('--lon <number>', 'Longitude', parseFloat)
  .option('--start <date>', 'Inclusive start date (YYYY-MM-DD), default today')
  .requiredOption('--until <date>', 'Inclusive end date (YYYY-MM-DD)')
  .option('--tz <iana>', 'IANA timezone; default inferred from lat/lon')
  .option('--export-csv <path>', 'Write Google Calendar importable CSV to path and exit')
  .option('--export-ics <path>', 'Write ICS calendar file to path and exit')
  .option('--lang <code>', 'Localization for summaries: en|es (default en)')
  .option('--dry-run', 'Do not call Google API, just print windows', false)
  .parse(process.argv);

async function main() {
  const opts = program.opts<{
    lat: number;
    lon: number;
    start?: string;
    until: string;
    tz?: string;
    dryRun?: boolean;
    exportCsv?: string;
    exportIcs?: string;
    lang?: 'en' | 'es';
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

  if (opts.exportIcs) {
    const ics = windowsToICS(windows, { lang: opts.lang });
    if (opts.exportIcs === '-') {
      process.stdout.write(ics);
    } else {
      const fs = await import('fs/promises');
      await fs.writeFile(opts.exportIcs, ics, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`ICS written to ${opts.exportIcs}`);
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

  // No OAuth flow; CLI exports only
  throw new Error('Specify --export-ics <path> or --export-csv <path>');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


