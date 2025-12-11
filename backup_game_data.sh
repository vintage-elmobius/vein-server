#!/usr/bin/env bash
set -euo pipefail

PGID="${PGID:-1000}"
PUID="${PUID:-1000}"
VEIN_USER="vein"
VEIN_GROUP="vein"

VEIN_SERVER_BACKUP_SRC_DIR=${VEIN_SERVER_BACKUP_SRC_DIR:-/data}
VEIN_SERVER_BACKUP_DIR=${VEIN_SERVER_BACKUP_DIR:-/backup}
VEIN_SERVER_BACKUP_RETENTION=${VEIN_SERVER_BACKUP_RETENTION:-5}
INTERVAL=${VEIN_SERVER_BACKUP_INTERVAL_SECONDS:-3600}

main() {
    now="$(date +%Y-%m-%d_%H%M%S).backup"
    mkdir -p "${VEIN_SERVER_BACKUP_DIR}/${now}"

    echo "[backup] Starting backup..."
    find "${VEIN_SERVER_BACKUP_SRC_DIR}" \
        -type d \
        -name "Saved" \
        -exec rsync -a "{}" "${VEIN_SERVER_BACKUP_DIR}/${now}" \;

    echo "[backup] Cleanup old backups..."
    if (( VEIN_SERVER_BACKUP_RETENTION > 0 )); then
        ls -1dt "${VEIN_SERVER_BACKUP_DIR}"/*/ \
            | grep -E '\.backup/?$' \
            | tail -n +$((VEIN_SERVER_BACKUP_RETENTION + 1)) \
            | xargs -r rm -rf
    fi
}

while true; do
    if [ "$(id -u "${VEIN_USER}")" != "${PUID}" ]; then
        usermod -o -u "${PUID}" "${VEIN_USER}"
    fi

    if [ "$(getent group "${VEIN_GROUP}" | cut -d: -f3)" != "${PGID}" ]; then
        groupmod -o -g "${PGID}" "${VEIN_GROUP}"
    fi

    if [ "$(stat -c %u "${VEIN_SERVER_BACKUP_DIR}")" != "${PUID}" ]; then
        echo "[backup] Fixing permissions on ${VEIN_SERVER_BACKUP_DIR}"
        chown -R "${VEIN_USER}:${VEIN_GROUP}" "${VEIN_SERVER_BACKUP_DIR}"
    fi

    gosu "${VEIN_USER}" bash -c "$(declare -f main); main"

    echo "[backup] Sleeping ${INTERVAL}s..."
    sleep "${INTERVAL}"
done
