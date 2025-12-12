FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    STEAMCMDDIR=/opt/steamcmd \
    SERVERDIR=/opt/server

# Base dependencies + 32-bit SteamCMD libs
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl unzip tini python3 \
      lib32gcc-s1 lib32stdc++6 \
      libatomic1 libasound2 libpulse0 libudev1 libcurl4 libsdl2-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create steam user (UID 1000)
RUN groupadd -g 1000 steam && \
    useradd -m -u 1000 -g 1000 -s /bin/bash steam && \
    mkdir -p "$STEAMCMDDIR" "$SERVERDIR" && \
    chown -R 1000:1000 "$STEAMCMDDIR" "$SERVERDIR"

# Install SteamCMD
RUN curl -sSL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz \
    | tar -xz -C "$STEAMCMDDIR" && \
    chmod +x "$STEAMCMDDIR/steamcmd.sh" && \
    chown -R 1000:1000 "$STEAMCMDDIR"

# Copy static dashboard
COPY web /opt/dashboard
RUN chown -R steam:steam /opt/dashboard

# Copy scripts
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/*.sh && \
    chown steam:steam /usr/local/bin/*.sh

# Switch to steam user
USER steam

WORKDIR /opt/server

EXPOSE 7777/udp 27015/udp 8080

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
