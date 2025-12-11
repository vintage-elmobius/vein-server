#!/usr/bin/env bash
set -e

APPID=2131400

STEAMCMDDIR="${STEAMCMDDIR:-/opt/steamcmd}"
SERVERDIR="${SERVERDIR:-/opt/server}"

BRANCH="${VEIN_BRANCH:-public}"
PORT="${PORT:-7777}"
QUERY_PORT="${QUERY_PORT:-27015}"
SERVER_NAME="${SERVER_NAME:-Vein Server}"
SERVER_DESCRIPTION="${SERVER_DESCRIPTION:-A Vein Server}"
SERVER_PASSWORD="${SERVER_PASSWORD:-}"
MAX_PLAYERS="${MAX_PLAYERS:-8}"
SUPER_ADMIN_STEAM_IDS="${SUPER_ADMIN_STEAM_IDS:-}"
ADMIN_STEAM_IDS="${ADMIN_STEAM_IDS:-}"
SERVERLIST_VISIBLE="${SERVERLIST_VISIBLE:-True}"
BIND_ADDR="${BIND_ADDR:-0.0.0.0}"
VAC_ENABLED="${VAC_ENABLED:-0}"

export HOME="/home/steam"

echo "[entrypoint] Updating Vein dedicated server (appid $APPID, branch $BRANCH)"

UPDATE_CMD="+force_install_dir $SERVERDIR +login anonymous +app_update $APPID validate +quit"

if [ "$BRANCH" != "public" ]; then
    UPDATE_CMD="+force_install_dir $SERVERDIR +login anonymous +app_update $APPID -beta $BRANCH validate +quit"
fi

# Run update
$STEAMCMDDIR/steamcmd.sh $UPDATE_CMD

# -------------------------------------------------------------------
# Install steamclient.so for SteamAPI
# -------------------------------------------------------------------
mkdir -p "$HOME/.steam/sdk64"
cp "$STEAMCMDDIR/linux64/steamclient.so" "$HOME/.steam/sdk64/steamclient.so"

echo "$APPID" > "$SERVERDIR/steam_appid.txt"

# -------------------------------------------------------------------
# Generate Game.ini every boot
# -------------------------------------------------------------------
CFG_DIR="$SERVERDIR/Vein/Saved/Config/LinuxServer"
CFG_FILE="$CFG_DIR/Game.ini"
mkdir -p "$CFG_DIR"

echo "[entrypoint] Writing Game.ini ..."
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
GameServerQueryPort=$QUERY_PORT
bVACEnabled=$VAC_ENABLED
Password=$SERVER_PASSWORD
Port=$PORT

[/Script/Vein.ServerSettings]
GS_HungerMultiplier=1
GS_MaxThirdPersonDistance=400
GS_ShowScoreboardBadges=1
GS_ThirstMultiplier=1
Vein.PvP=False
Vein.AISpawner.Enabled=True
Vein.TimeMultiplier=16

[OnlineSubsystemSteam]
GameServerQueryPort=$QUERY_PORT
EOF

echo "[entrypoint] Starting Vein server: Port=$PORT QueryPort=$QUERY_PORT"

cd "$SERVERDIR"

exec "$SERVERDIR/Vein/Binaries/Linux/VeinServer-Linux-Test" \
    -Port="$PORT" \
    -QueryPort="$QUERY_PORT" \
    -log
