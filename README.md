# Vein Dedicated Server & Dashboard

This repository builds a Docker image for hosting the Vein dedicated server and an optional static HTTP API dashboard. The image runs as the `steam` user (UID/GID 1000) and exposes both the game and dashboard ports.

## Exposed ports

- `7777/udp` — game traffic (`PORT`)
- `27015/udp` — game query port (`QUERY_PORT`)
- `8080/tcp` — optional dashboard (`DASHBOARD_PORT`)

## Quick start with Docker Compose

```yaml
version: "3.8"
services:
  vein:
    image: elmobius/vein-server:latest
    container_name: vein-server
    restart: unless-stopped
    environment:
      TZ: "America/New_York"
      VEIN_BRANCH: "public"
      PORT: "7788"
      QUERY_PORT: "27055"
      SERVER_NAME: "My Dockerized VEIN Server - Change My Name"
      SERVER_DESCRIPTION: "Its a server. That you can join. If you have the password. Which you probably don't."
      SERVER_PASSWORD: "password"
      MAX_PLAYERS: "8"
      SUPER_ADMIN_STEAM_IDS: "SteamID64" # comma-separated SteamID64 values
      ADMIN_STEAM_IDS: ""
      DASHBOARD_ENABLED: "true"
      DASHBOARD_PORT: "8080"
    volumes:
      - /srv/games/vein-data:/opt/server
    ports:
      - "7777:7777/udp"
      - "27015:27015/udp"
      - "8080:8080" # Dashboard (HTTP)

  vein-server-backup:
    image: elmobius/vein-backup:latest
    container_name: vein-backup
    restart: unless-stopped
    volumes:
      - /srv/games/vein-data:/data:ro
      - /srv/games/vein-backups:/backup
    environment:
      PUID: 1000
      PGID: 1000
      VEIN_SERVER_BACKUP_INTERVAL_SECONDS: 7200
      VEIN_SERVER_BACKUP_RETENTION: 10
```

## Using the bundled web dashboard

1. Start the container with the dashboard enabled and port `8080` mapped.
2. Open `http://localhost:8080` in your browser.
3. Enter the base API URL for your server (for example `http://localhost:7788` if running locally).
4. Click a common endpoint or enter a custom path to view live responses. Authentication tokens can be pasted into the optional field when required.

Environment variables:

- `DASHBOARD_ENABLED` — serve the dashboard (default `true`).
- `DASHBOARD_PORT` — HTTP port for the dashboard (default `8080`).
- `DASHBOARD_DIR` — directory containing the static assets (default `/opt/dashboard`).

## Manual dashboard testing outside Docker

If you prefer to run the dashboard locally, you can serve the static files directly:

```bash
python -m http.server 8000 --directory web
```

Then browse to `http://localhost:8000`, set the base API URL, and interact with the endpoints.
