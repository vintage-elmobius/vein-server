FROM nginx:alpine

# Remove default config shipped with nginx
RUN rm -f /etc/nginx/conf.d/default.conf

# Write our nginx config directly
RUN cat <<'EOF' > /etc/nginx/conf.d/default.conf
server {
    listen 8081;

    # Serve frontend
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Proxy Vein HTTP API (localhost-only inside vein-server)
    location /api/ {
        proxy_pass http://vein-server:8443/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_read_timeout 30s;
    }
}
EOF

# Copy frontend files
COPY web/ /usr/share/nginx/html/

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]
