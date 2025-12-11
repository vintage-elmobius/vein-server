FROM alpine:latest

# Defaults (can be overridden by environment variables)
ENV VEIN_SERVER_BACKUP_INTERVAL_SECONDS=3600 \
    VEIN_SERVER_BACKUP_RETENTION=10 \
    VEIN_SERVER_BACKUP_SRC_DIR=/data \
    VEIN_SERVER_BACKUP_DIR=/backup \
    PUID=1000 \
    PGID=1000

# Required utilities
RUN apk update && \
    apk add --no-cache bash rsync findutils coreutils shadow gosu

# Create user with matching UID/GID
RUN addgroup -g 1000 vein && \
    adduser -D -u 1000 -G vein -s /bin/bash vein

# Copy backup script
COPY backup_game_data.sh /usr/local/bin/backup_game_data
RUN chmod +x /usr/local/bin/backup_game_data

CMD ["/usr/local/bin/backup_game_data"]
