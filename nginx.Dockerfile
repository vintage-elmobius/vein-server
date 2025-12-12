FROM nginx:alpine

# Remove the default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy frontend files
COPY web /usr/share/nginx/html

EXPOSE 8081
