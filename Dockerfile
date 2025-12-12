FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    STEAMCMDDIR=/opt/steamcmd \
    SERVERDIR=/opt/server

# --------------------------------------------------
# Base deps (Vein + SteamCMD + NGINX)
# --------------------------------------------------
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl unzip tini nginx \
      lib32gcc-s1 lib32stdc++6 \
      libatomic1 libasound2 libpulse0 libudev1 libcurl4 libsdl2-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# --------------------------------------------------
# Steam user
# --------------------------------------------------
RUN groupadd -g 1000 steam && \
    useradd -m -u 1000 -g 1000 -s /bin/bash steam && \
    mkdir -p "$STEAMCMDDIR" "$SERVERDIR" && \
    chown -R steam:steam "$STEAMCMDDIR" "$SERVERDIR"

# --------------------------------------------------
# SteamCMD
# --------------------------------------------------
RUN curl -sSL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz \
    | tar -xz -C "$STEAMCMDDIR" && \
    chmod +x "$STEAMCMDDIR/steamcmd.sh" && \
    chown -R steam:steam "$STEAMCMDDIR"

# --------------------------------------------------
# Dashboard UI
# --------------------------------------------------
COPY web /opt/dashboard
RUN chown -R steam:steam /opt/dashboard

# --------------------------------------------------
# NGINX config
# --------------------------------------------------
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# --------------------------------------------------
# Entrypoint
# --------------------------------------------------
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chown steam:steam /usr/local/bin/entrypoint.sh

USER steam
WORKDIR /opt/server

EXPOSE 7777/udp 27015/udp 8081

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
