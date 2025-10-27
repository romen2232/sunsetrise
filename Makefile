.PHONY: help install test test-watch build docker-build docker-run

help:
	@echo "Available targets:"
	@echo "  make install        # Install deps inside Docker (bind-mounted workspace)"
	@echo "  make test           # Run unit tests"
	@echo "  make test-watch     # Watch mode for tests"
	@echo "  make build          # Compile TypeScript"
	@echo "  make docker-build   # Build Docker image"
	@echo "  make docker-run     # Run container (set LAT, LON, UNTIL, DATA)"

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
	docker build -t sunsetrise:latest .

# Variables for docker-run; override on command line, e.g.:
# make docker-run LAT=40.7128 LON=-74.0060 UNTIL=2025-12-31 DATA=./data
LAT ?=
LON ?=
UNTIL ?=
TZ ?=
CALENDAR_ID ?=
DATA ?= ./data

docker-run:
	@[ -n "$(LAT)" ] || (echo "LAT is required" && exit 1)
	@[ -n "$(LON)" ] || (echo "LON is required" && exit 1)
	@[ -n "$(UNTIL)" ] || (echo "UNTIL is required (YYYY-MM-DD)" && exit 1)
	docker run -it --rm \
	  -v $(abspath $(DATA)):/data \
	  sunsetrise:latest \
	  --lat $(LAT) --lon $(LON) --until $(UNTIL) \
	  $(if $(TZ),--tz $(TZ),) $(if $(CALENDAR_ID),--calendarId $(CALENDAR_ID),)


