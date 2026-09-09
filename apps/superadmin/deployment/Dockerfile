FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS builder

WORKDIR /app
COPY . .
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 PUPPETEER_SKIP_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install --ignore-scripts

WORKDIR /app/apps/superadmin
RUN bun run build

FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10

COPY --from=builder /app/apps/superadmin/dist /usr/share/nginx/html

# Boss SPA: /api → web-service:5003; uzaktan görünüm tüneli /fields/:fid/ui/*
# (HTTP + WS köprüsü) regex ile yalnızca TÜNEL yollarına proxy'lenir —
# SPA'nın kendi /fields/:id rotaları try_files'a düşer.
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  \
  location ~ ^/fields/[^/]+/ui/ { \
    proxy_pass http://web-service:5003; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    proxy_read_timeout 3600s; \
    proxy_send_timeout 3600s; \
  } \
  \
  location /api { \
    proxy_pass http://web-service:5003; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    proxy_read_timeout 300s; \
    proxy_connect_timeout 30s; \
    proxy_send_timeout 300s; \
  } \
  \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
