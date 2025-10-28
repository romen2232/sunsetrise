.PHONY: help install test test-watch build docker-build docker-run calendar

help:
	@echo "Available targets:"
	@echo "  make install        # Install deps inside Docker (bind-mounted workspace)"
	@echo "  make test           # Run unit tests"
	@echo "  make test-watch     # Watch mode for tests"
	@echo "  make build          # Compile TypeScript"
	@echo "  make docker-build   # Build Docker image"
	@echo "  make docker-run     # Run container (set LAT, LON, UNTIL, DATA)"
	@echo "  make calendar       # Export calendar (FORMAT=ics|csv, LAT, LON, UNTIL, [START], [LANG], [OUT])"

# Dockerized install to avoid host Node.js dependency and permission issues
NODE_IMAGE ?= node:20-alpine
UID := $(shell id -u)
GID := $(shell id -g)

install:
	docker run --rm -u $(UID):$(GID) \
	  -v $(CURDIR):/app -w /app $(NODE_IMAGE) \
	  sh -lc 'npm ci || npm install'

test:
	npm test

test-watch:
	npm run test:watch

build:
	npm run build

docker-build:
	docker build -t sunsetrise-calendar:latest .

# Variables for docker-run; override on command line, e.g.:
# make docker-run LAT=40.7128 LON=-74.0060 UNTIL=2025-12-31 DATA=./data
LAT ?=
LON ?=
# Default UNTIL to 1 week from now (Linux GNU date)
UNTIL ?= $(shell date -I -d "+7 days")
TZ ?=
CALENDAR_ID ?=
DATA ?= ./data
# Resolve host user/group to avoid root-owned files from container writes
UID := $(shell id -u)
GID := $(shell id -g)
EXTRA ?=
FORMAT ?= ics
OUT ?= ./data/sunlight.$(FORMAT)
LANG ?= en

docker-run:
	@[ -n "$(LAT)" ] || (echo "LAT is required" && exit 1)
	@[ -n "$(LON)" ] || (echo "LON is required" && exit 1)
	@[ -n "$(UNTIL)" ] || (echo "UNTIL is required (YYYY-MM-DD)" && exit 1)
	docker run -it --rm -u $(UID):$(GID) \
	  -v $(abspath $(DATA)):/data \
	  sunsetrise-calendar:latest \
	  --lat $(LAT) --lon $(LON) --until $(UNTIL) \
	  $(if $(TZ),--tz $(TZ),) $(if $(CALENDAR_ID),--calendarId $(CALENDAR_ID),) $(EXTRA)

# Convenience target: export calendar (ICS/CSV)
calendar: docker-build
	@[ -n "$(LAT)" ] || (echo "LAT is required" && exit 1)
	@[ -n "$(LON)" ] || (echo "LON is required" && exit 1)
	@mkdir -p $(dir $(OUT))
	@if [ "$(FORMAT)" = "ics" ]; then \
	  $(MAKE) docker-run LAT=$(LAT) LON=$(LON) UNTIL=$(UNTIL) DATA=$(dir $(abspath $(OUT))) EXTRA="--export-ics /data/$(notdir $(OUT)) $(if $(LANG),--lang $(LANG),) $(if $(START),--start $(START),)" ; \
	else \
	  $(MAKE) docker-run LAT=$(LAT) LON=$(LON) UNTIL=$(UNTIL) DATA=$(dir $(abspath $(OUT))) EXTRA="--export-csv /data/$(notdir $(OUT))" ; \
	fi


