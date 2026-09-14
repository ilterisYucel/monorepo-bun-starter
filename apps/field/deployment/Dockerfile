FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS builder

WORKDIR /app
COPY . .
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 PUPPETEER_SKIP_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install --ignore-scripts

WORKDIR /app/apps/field
# Tek saha kimliği build sırasında SPA'ya gömülür (compose build args).
ARG VITE_FIELD_ID
ENV VITE_FIELD_ID=$VITE_FIELD_ID
# Ürün guard'ı (ws-tunnel paketleme sözleşmesi): FIELD_ID'siz build kırık
# tünel base'i gömebilirdi (/fields//ui/) — fail-fast reddedilir.
RUN test -n "$VITE_FIELD_ID" || (echo "VITE_FIELD_ID build arg'i zorunludur (tek saha modeli)" && exit 1)
# Boss Faz 3: prod SPA tünel alt yolunda servis edilir — Vite asset yollarını
# mutlak üretir; base tünel köküne GÖMÜLÜR (dev karşılığı: compose env
# VITE_TUNNEL_BASE). Boss tüneli /fields/<fid>/ui önekini strip edip
# "/"-kök patikaları iletir; gömülü base ile SPA asset'leri boss origin'ine
# değil tünel köküne isabet eder (beyaz ekran/MIME hatasının kök nedeni buydu).
ENV VITE_TUNNEL_BASE=/fields/${VITE_FIELD_ID}/ui/
RUN bun run build

FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10

COPY --from=builder /app/apps/field/dist /usr/share/nginx/html

RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
  \
  location ~ ^/fields/[^/]+/ui/(.*)$ { \
    try_files /$1 /index.html; \
  } \
  \
  location /api { \
    proxy_pass http://web-service:5002; \
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
  location /containers/ { \
    proxy_pass http://web-service:5002; \
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
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
