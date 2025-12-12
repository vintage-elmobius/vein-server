# Vein Dedicated Server & Dashboard

This repository builds a Docker image for hosting the Vein dedicated server and an optional static HTTP API dashboard. The image runs as the `steam` user (UID/GID 1000) and exposes both the game and dashboard ports.

## Exposed ports

- `7777/udp` — game traffic (`PORT`)
- `27015/udp` — game query port (`QUERY_PORT`)
- `8080/tcp` — optional dashboard (`DASHBOARD_PORT`)

## Using the bundled web dashboard

1. Start the container with the dashboard enabled and port `8081` mapped.
2. Open `http://<host.address>:8081` in your browser.

Environment variables:

- `DASHBOARD_ENABLED` — serve the dashboard (default `true`).
- `DASHBOARD_PORT` — HTTP port for the dashboard (default `8080`).
- `DASHBOARD_DIR` — directory containing the static assets (default `/opt/dashboard`).
