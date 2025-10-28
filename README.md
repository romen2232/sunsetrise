# SunsetRise Calendar

Turn sunlight into schedule. Generate Golden/Blue hour windows for a location and import them into your calendar.

## ✨ Features

- Accurate daily windows using sunrise/sunset and civil twilight
- Two helpful slots per day: Morning (Blue → Golden) and Evening (Golden → Blue)
- ICS (default) and CSV export for quick calendar import (no OAuth required)
- Export only. No OAuth, no tokens, no external services
- Timezone auto-detected from coordinates (DST-safe)

## ⚡ 60‑second quickstart (ICS)

```bash
# 1) Build the Docker image (or use: make docker-build)
docker build -t sunsetrise-calendar:latest .

# 2) Export a calendar in one command (defaults: FORMAT=ics, UNTIL=+7 days)
make calendar LAT=<LAT> LON=<LON>

# Examples
# - ICS in Spanish for the rest of the year
make calendar LAT=<LAT> LON=<LON> UNTIL=<YYYY-MM-DD> LANG=es OUT=./data/sunlight_year.ics

# - CSV for next week (default UNTIL)
make calendar FORMAT=csv LAT=<LAT> LON=<LON> OUT=./data/sunlight.csv

# Optionally, run locally without Docker:
npm run dev -- --lat <LAT> --lon <LON> --until <YYYY-MM-DD> --export-ics ./sunlight.ics
```

Import the ICS into your calendar app:

1. Open your calendar app’s Import feature
2. Choose `sunlight.ics` and the target calendar

No OAuth needed: export ICS/CSV and import into any calendar app.

## 🧭 CLI flags

- `--lat`, `--lon`: coordinates (required)
- `--until`: inclusive end date `YYYY-MM-DD` (default: +7 days from now)
- `--start`: optional start date (default: today, UTC)
- `--tz`: optional IANA timezone (default inferred from coordinates)
- `--calendarId`: (removed)
- `--dry-run`: print windows, do not write events
- `--export-ics <path|->`: write an ICS calendar file and exit (`-` writes to stdout)
- `--export-csv <path|->`: write a CSV calendar file and exit (`-` writes to stdout)

## 🧰 Makefile commands

- `make install`: install deps inside Docker using your UID/GID
- `make test`, `make test-watch`: run unit tests (Vitest)
- `make docker-build`: build the production image
- `make docker-run LAT=.. LON=.. [UNTIL=..] [START=..] [TZ=.. DATA=./data EXTRA=..]`: run the containerized CLI
- `make calendar FORMAT=ics|csv LAT=.. LON=.. [UNTIL=..] [START=..] [LANG=en|es] [OUT=./data/sunlight.<ext>]`: export calendar

## 📄 What’s inside each event

- Title: `HH:mm Sunrise` or `HH:mm Sunset` (localized)
- Description (plain text): rows like `HH:MM - HH:MM  NN min.  Description`
- Description (HTML): table with 3 columns [Time | Duration | Description]; Sunrise/Atardecer in bold
- Extra blank rows after morning golden hour, after solar noon, and before evening golden hour

## 💡 Tips

- Use a dedicated calendar when importing CSV so you can color/toggle easily
- Re‑run when traveling to rebuild CSV or update events for your new location
- Override timezone with `--tz` if you need to pin a specific region

## ❓ FAQ

- Do I need `/data` to export files?
  - Only when using Docker. `/data` is the bind‑mounted folder so ICS/CSV files persist on your host. Locally you can write anywhere, or use `--export-ics -` / `--export-csv -` to print to stdout.
- Will importing create duplicates?
  - If you import the same file multiple times, many calendar apps will create duplicates. Prefer importing into a dedicated calendar so you can clear/re‑import easily.
- Polar regions?
  - Days with missing sunrise/sunset will be skipped.

## ⚙️ Environment & output

- Outputs go to `./data` by default (kept out of git; only `data/.gitkeep` is tracked)
- No secrets required; export‑only workflow
