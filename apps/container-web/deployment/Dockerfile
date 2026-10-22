FROM oven/bun:1.4.3@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 AS builder

# 🔥 ARTIK VITE_API_URL'E GEREK YOK!
WORKDIR /app
COPY . .
ENV PUPPETEER_SKIP_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install
WORKDIR /app/apps/container-web
RUN bun run build

FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10

# Build output'u kopyala
COPY --from=builder /app/apps/container-web/dist /usr/share/nginx/html

# 🔥 NGINX PROXY CONFIG - BURASI ÇOK ÖNEMLİ
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  resolver 127.0.0.11 valid=10s ipv6=off; \
  \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
  \
  location /ws { \
    set $backend http://web-service:5001; \
    proxy_pass $backend; \
    proxy_http_version 1.1; \
    proxy_set_header Upgrade $http_upgrade; \
    proxy_set_header Connection "upgrade"; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    proxy_read_timeout 86400s; \
    proxy_send_timeout 86400s; \
  } \
  \
  location /api { \
    set $backend http://web-service:5001; \
    proxy_pass $backend; \
    proxy_http_version 1.1; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    proxy_read_timeout 300s; \
    proxy_connect_timeout 30s; \
    proxy_send_timeout 300s; \
  } \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]