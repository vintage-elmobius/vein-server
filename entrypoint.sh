#!/usr/bin/env bash
set -e

APPID=2131400

STEAMCMDDIR="/opt/steamcmd"
SERVERDIR="/opt/server"
CFG_DIR="$SERVERDIR/Vein/Saved/Config/LinuxServer"
CFG_FILE="$CFG_DIR/Game.ini"

# ---------------------------------------------------
# Environment variables (with defaults)
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
DASHBOARD_PORT="${DASHBOARD_PORT:-8080}"

export HOME="/home/steam"

# ---------------------------------------------------
# Update server files
# ---------------------------------------------------
echo "[entrypoint] Updating Vein dedicated server…"
$STEAMCMDDIR/steamcmd.sh \
    +force_install_dir "$SERVERDIR" \
    +login anonymous \
    +app_update $APPID validate \
    +quit

# Steam API lib
mkdir -p "$HOME/.steam/sdk64"
cp "$STEAMCMDDIR/linux64/steamclient.so" "$HOME/.steam/sdk64/steamclient.so"

echo "$APPID" > "$SERVERDIR/steam_appid.txt"

mkdir -p "$CFG_DIR"

# ---------------------------------------------------
# Create Game.ini only if it does NOT exist
# ---------------------------------------------------
if [ ! -f "$CFG_FILE" ]; then
    echo "[entrypoint] Creating initial Game.ini from environment variables."

    cat > "$CFG_FILE" <<EOF
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
Port=$PORT
EOF

    # Optional HTTPPort (only if enabled)
    if printf '%s' "$DASHBOARD_ENABLED" | grep -qiE '^(true|1|yes)$'; then
        echo "HTTPPort=$DASHBOARD_PORT" >> "$CFG_FILE"
        echo "[entrypoint] Added HTTPPort=$DASHBOARD_PORT"
    else
        echo "[entrypoint] Dashboard disabled — HTTPPort omitted."
    fi

    cat >> "$CFG_FILE" <<EOF

[/Script/Vein.VeinGameStateBase]
WhitelistedPlayers=

[OnlineSubsystemSteam]
GameServerQueryPort=$QUERY_PORT
bVACEnabled=$VAC_ENABLED
EOF

else
    echo "[entrypoint] Game.ini already exists — NOT modifying it."
fi

# ---------------------------------------------------
# Start the server
# ---------------------------------------------------
echo "[entrypoint] Launching Vein server on Port=$PORT, QueryPort=$QUERY_PORT"

cd "$SERVERDIR"

exec "$SERVERDIR/Vein/Binaries/Linux/VeinServer-Linux-Test" \
    -Port="$PORT" \
    -QueryPort="$QUERY_PORT" \
    -log
