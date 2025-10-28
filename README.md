# sunsetrise

Turn sunlight into schedule. Generate Golden/Blue hour windows for a location and get them into Google Calendar.

## ✨ Features

- Accurate daily windows using sunrise/sunset and civil twilight
- Two helpful slots per day: Morning (Blue → Golden) and Evening (Golden → Blue)
- ICS and CSV export for quick Google Calendar import (no OAuth required)
- Export only (ICS/CSV). Direct Google OAuth write removed for simplicity
- Timezone auto-detected from coordinates (DST-safe)

## ⚡ 60‑second quickstart (ICS, no OAuth)

```bash
# 1) Build the Docker image (or use: make docker-build)
docker build -t sunsetrise:latest .

# 2) Export ICS with one command
make ics LAT=<LAT> LON=<LON> UNTIL=<YYYY-MM-DD> LANG=es

# Optionally, run locally without Docker:
npm run dev -- --lat <LAT> --lon <LON> --until <YYYY-MM-DD> --export-ics ./sunlight.ics
```

Import the ICS into Google Calendar:

1. Open Google Calendar → Settings → Import & export → Import
2. Choose `sunlight.ics` and the target calendar

## 🔐 About OAuth

Direct write to Google Calendar via OAuth has been removed to keep setup simple and private. Export ICS/CSV and import into any calendar.

## 🧭 CLI flags

- `--lat`, `--lon`: coordinates (required)
- `--until`: inclusive end date `YYYY-MM-DD` (required)
- `--start`: optional start date (default today, UTC)
- `--tz`: optional IANA timezone (default inferred from coordinates)
- `--calendarId`: (removed)
- `--dry-run`: print windows, do not write events
- `--export-ics <path|->`: write an ICS calendar file and exit (`-` writes to stdout)
- `--export-csv <path|->`: write a Google Calendar‑importable CSV and exit (`-` writes to stdout)

## 🧰 Makefile commands

- `make install`: install deps inside Docker using your UID/GID
- `make test`, `make test-watch`: run unit tests (Vitest)
- `make docker-build`: build the production image
- `make docker-run LAT=.. LON=.. UNTIL=.. [TZ=.. CALENDAR_ID=.. DATA=./data EXTRA=..]`: run the tool
- `make ics LAT=.. LON=.. UNTIL=.. [LANG=en] [ICS_OUT=./data/sunlight.ics]`: export ICS
- `make csv LAT=.. LON=.. UNTIL=.. [CSV_OUT=./data/sunlight.csv]`: export CSV

## 📅 What gets created

- A secondary calendar named `Golden/Blue Windows` (OAuth path)
- Two events per day:
  - Morning: civil dawn → goldenHourEnd (Blue → Golden)
  - Evening: goldenHourStart → civil dusk (Golden → Blue)

## 💡 Tips

- Use a dedicated calendar when importing CSV so you can color/toggle easily
- Re‑run when traveling to rebuild CSV or update events for your new location
- Override timezone with `--tz` if you need to pin a specific region

## ❓ FAQ

- Do I need `/data` to export files?
  - Only when using Docker. `/data` is the bind‑mounted folder so ICS/CSV files persist on your host. Locally you can write anywhere, or use `--export-ics -` / `--export-csv -` to print to stdout.
- Will Google import create duplicates?
  - If you import the same CSV multiple times, Google may create duplicates. Prefer importing into a dedicated calendar so you can clear/re‑import easily.
- Polar regions?
  - Days with missing sunrise/sunset will be skipped.

## ⚙️ Environment variables (optional)

- `CALENDAR_NAME`: override default calendar display name
- `TOKEN_PATH`: where to store OAuth token (default `/data/token.json`)
- `CLIENT_PATH`: path to OAuth client JSON (default `/data/client_secret.json`)
