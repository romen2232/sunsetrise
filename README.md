# sunsetrise

Turn sunlight into schedule. Generate Golden/Blue hour windows for a location and get them into Google Calendar.

## ✨ Features

- Accurate daily windows using sunrise/sunset and civil twilight
- Two helpful slots per day: Morning (Blue → Golden) and Evening (Golden → Blue)
- CSV export for quick Google Calendar import (no OAuth required)
- Optional direct write to Google Calendar via OAuth
- Timezone auto-detected from coordinates (DST-safe)

## ⚡ 60‑second quickstart (CSV, no OAuth)

```bash
# 1) Build the Docker image (or use: make docker-build)
docker build -t sunsetrise:latest .

# 2) Export CSV to your host (bind‑mount a folder)
mkdir -p ./data
docker run --rm \
  -v "$(pwd)/data:/data" \
  sunsetrise:latest \
  --lat <LAT> --lon <LON> \
  --until <YYYY-MM-DD> \
  --export-csv /data/sunlight.csv

# Optionally, run locally without Docker:
npm run dev -- --lat <LAT> --lon <LON> --until <YYYY-MM-DD> --export-csv ./sunlight.csv
```

Import the CSV into Google Calendar:

1. Open Google Calendar → Settings → Import & export → Import
2. Choose `sunlight.csv` and the target calendar

## 🔐 Alternative: Direct Google write (OAuth)

Create/update events automatically on a secondary calendar.

1. In Google Cloud Console, create an OAuth Client (Desktop or Web) and download the JSON
2. Save it to `/path/to/data/client_secret.json` on your host
3. Build and run:

```bash
make docker-build
make docker-run LAT=<LAT> LON=<LON> UNTIL=<YYYY-MM-DD> DATA=/path/to/data
```

On first run, follow the printed auth URL and paste the code. Tokens are saved to `/data/token.json` for reuse.

## 🧭 CLI flags

- `--lat`, `--lon`: coordinates (required)
- `--until`: inclusive end date `YYYY-MM-DD` (required)
- `--start`: optional start date (default today, UTC)
- `--tz`: optional IANA timezone (default inferred from coordinates)
- `--calendarId`: optional target calendar ID (OAuth path; default creates "Golden/Blue Windows")
- `--dry-run`: print windows, do not write events
- `--export-csv <path|->`: write a Google Calendar‑importable CSV and exit (`-` writes to stdout)

## 🧰 Makefile commands

- `make install`: install deps inside Docker using your UID/GID
- `make test`, `make test-watch`: run unit tests (Vitest)
- `make docker-build`: build the production image
- `make docker-run LAT=.. LON=.. UNTIL=.. [TZ=.. CALENDAR_ID=.. DATA=./data]`: run the tool

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

- Do I need `/data` to export CSV?
  - Only when using Docker. `/data` is the bind‑mounted folder so the CSV persists on your host. Locally you can write anywhere, or use `--export-csv -` to print to stdout.
- Will Google import create duplicates?
  - If you import the same CSV multiple times, Google may create duplicates. Prefer importing into a dedicated calendar so you can clear/re‑import easily.
- Polar regions?
  - Days with missing sunrise/sunset will be skipped.

## ⚙️ Environment variables (optional)

- `CALENDAR_NAME`: override default calendar display name
- `TOKEN_PATH`: where to store OAuth token (default `/data/token.json`)
- `CLIENT_PATH`: path to OAuth client JSON (default `/data/client_secret.json`)
