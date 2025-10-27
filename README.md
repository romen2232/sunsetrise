# sunsetrise
Create Google Calendar events spanning Blue → Golden (AM) and Golden → Blue (PM) windows for a given location.

## Quick start (Docker)

1. Create a Google OAuth client (Desktop or Web) in Google Cloud Console and download the credentials JSON. Save it as `/path/to/data/client_secret.json` on your host.
2. Build the container:

```bash
# with Makefile
make docker-build

# or raw Docker
docker build -t sunsetrise:latest /home/romenmedina/personal/sunsetrise
```

3. Run (first time prompts for auth code):

```bash
# with Makefile (recommended)
make docker-run LAT=40.7128 LON=-74.0060 UNTIL=2025-12-31 DATA=/path/to/data

# or raw Docker
docker run -it --rm \
  -v /path/to/data:/data \
  sunsetrise:latest \
  --lat 40.7128 --lon -74.0060 \
  --until 2025-12-31
```

Flags:
- `--lat`, `--lon`: coordinates (required)
- `--until`: inclusive end date `YYYY-MM-DD` (required)
- `--start`: optional start date (default today, UTC)
- `--tz`: optional IANA timezone (default inferred from coordinates)
- `--calendarId`: optional target calendar ID (default creates "Golden/Blue Windows")
- `--dry-run`: print windows, do not write events
- `--export-csv <path>`: write a Google Calendar importable CSV and exit

OAuth files in the mounted volume `/data`:
- `client_secret.json`: OAuth client credentials you downloaded
- `token.json`: generated after first run and reused

## What it creates
- A secondary calendar named `Golden/Blue Windows` (unless `--calendarId` used)
- For each day: two events
  - Morning: `civil dawn → goldenHourEnd` (Blue → Golden)
  - Evening: `goldenHourStart → civil dusk` (Golden → Blue)

## Dev

```bash
# Install dependencies inside Docker (no host Node needed)
make install

# Local dry run without writing to Google Calendar
npm run dev -- --lat 40.7 --lon -74.0 --until 2025-12-31 --dry-run
```

## Tests

```bash
# Using Makefile
make test
make test-watch

# Or with npm
npm test
npm run test:watch
```

## CSV export for Google Calendar

To produce a CSV you can import into Google Calendar:

```bash
# Inside Docker container run (mount to persist onto host)
docker run -it --rm \
  -v /path/to/data:/data \
  sunsetrise:latest \
  --lat 40.7128 --lon -74.0060 \
  --until 2025-12-31 \
  --export-csv /data/sunlight.csv

# Or with Makefile (ensure image built)
make docker-run LAT=40.7128 LON=-74.0060 UNTIL=2025-12-31 DATA=/path/to/data \
  -- --export-csv /data/sunlight.csv
```

Then, in Google Calendar: Settings -> Import & export -> Import -> select the CSV and target calendar.

Local (no Docker) examples:

```bash
# Write CSV to a local file
npm run dev -- --lat 40.7128 --lon -74.0060 --until 2025-12-31 --export-csv ./sunlight.csv

# Or print to stdout and redirect
npm run dev -- --lat 40.7128 --lon -74.0060 --until 2025-12-31 --export-csv - > sunlight.csv
```

## Makefile commands

- `make install`: run npm install inside a Docker container, using your UID/GID and binding the repo
- `make test`, `make test-watch`: run unit tests (Vitest)
- `make docker-build`: build the production image
- `make docker-run LAT=.. LON=.. UNTIL=.. [TZ=.. CALENDAR_ID=.. DATA=./data]`: run the tool

Environment variables (optional):
- `CALENDAR_NAME`: override default calendar display name
- `TOKEN_PATH`: path for storing token (default `/data/token.json`)
- `CLIENT_PATH`: path to OAuth client JSON (default `/data/client_secret.json`)
