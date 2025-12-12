#!/usr/bin/env bash
set -e

APPID=2131400

STEAMCMDDIR="${STEAMCMDDIR:-/opt/steamcmd}"
SERVERDIR="${SERVERDIR:-/opt/server}"
CFG_DIR="$SERVERDIR/Vein/Saved/Config/LinuxServer"
CFG_FILE="$CFG_DIR/Game.ini"

# ---------------------------------------------------
# Environment variables (defaults)
# ---------------------------------------------------
PORT="${PORT:-7777}"
QUERY_PORT="${QUERY_PORT:-27015}"

MAX_PLAYERS="${MAX_PLAYERS:-8}"
SERVERLIST_VISIBLE="${SERVERLIST_VISIBLE:-True}"
SERVER_NAME="${SERVER_NAME:-Vein Server}"
SERVER_DESCRIPTION="${SERVER_DESCRIPTION:-A Dockerized Vein Server}"

SERVER_PASSWORD="${SERVER_PASSWORD:-}"
SUPER_ADMIN_STEAM_IDS="${SUPER_ADMIN_STEAM_IDS:-}"
ADMIN_STEAM_IDS="${ADMIN_STEAM_IDS:-}"

BIND_ADDR="${BIND_ADDR:-0.0.0.0}"
VAC_ENABLED="${VAC_ENABLED:-0}"

DASHBOARD_ENABLED="${DASHBOARD_ENABLED:-true}"
DASHBOARD_PORT="${DASHBOARD_PORT:-8443}"

export HOME="/home/steam"

# ---------------------------------------------------
# Update server binaries
# ---------------------------------------------------
echo "[entrypoint] Updating Vein dedicated server…"

$STEAMCMDDIR/steamcmd.sh \
  +force_install_dir "$SERVERDIR" \
  +login anonymous \
  +app_update $APPID validate \
  +quit

mkdir -p "$HOME/.steam/sdk64"
cp "$STEAMCMDDIR/linux64/steamclient.so" "$HOME/.steam/sdk64/steamclient.so"
echo "$APPID" > "$SERVERDIR/steam_appid.txt"

mkdir -p "$CFG_DIR"

# ---------------------------------------------------
# Create Game.ini ONLY if missing
# ---------------------------------------------------
if [ ! -f "$CFG_FILE" ]; then
  echo "[entrypoint] Creating initial Game.ini from env vars"

  {
    cat <<EOF
[/Script/Engine.GameSession]
MaxPlayers=$MAX_PLAYERS

[/Script/Vein.VeinGameSession]
bPublic=$SERVERLIST_VISIBLE
ServerName=$SERVER_NAME
ServerDescription=$SERVER_DESCRIPTION
BindAddr=$BIND_ADDR
SuperAdminSteamIDs=$SUPER_ADMIN_STEAM_IDS
AdminSteamIDs=$ADMIN_STEAM_IDS
HeartbeatInterval=5.0
Password=$SERVER_PASSWORD
EOF

    if printf '%s' "$DASHBOARD_ENABLED" | grep -qiE '^(true|1|yes)$'; then
      echo "HTTPPort=$DASHBOARD_PORT"
      echo "[entrypoint] HTTP API enabled on port $DASHBOARD_PORT"
    fi

    cat <<EOF

[/Script/Vein.VeinGameStateBase]
WhitelistedPlayers=

[OnlineSubsystemSteam]
GameServerQueryPort=$QUERY_PORT
bVACEnabled=$VAC_ENABLED

[URL]
Port=$PORT
EOF
  } > "$CFG_FILE"

else
  echo "[entrypoint] Game.ini exists — not modifying"
fi

# ---------------------------------------------------
# Start Vein server (background)
# ---------------------------------------------------
echo "[entrypoint] Starting Vein server"
"$SERVERDIR/Vein/Binaries/Linux/VeinServer-Linux-Test" \
  -Port="$PORT" \
  -QueryPort="$QUERY_PORT" \
  -log &

# ---------------------------------------------------
# Start NGINX (foreground)
# ---------------------------------------------------
echo "[entrypoint] Starting NGINX"
exec nginx -g "daemon off;"
