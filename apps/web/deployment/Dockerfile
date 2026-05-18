# Stage 1: Builder
FROM oven/bun:latest AS builder

WORKDIR /app

# package.json'ları kopyala
COPY package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/

# Bağımlılıkları yükle
RUN bun install

# Kaynak kodları kopyala
COPY tsconfig.base.json ./
COPY apps/web/ apps/web/
COPY packages/shared-types/ packages/shared-types/
COPY packages/shared-utils/ packages/shared-utils/

# Build al
RUN cd apps/web && bun run build

# Stage 2: Production (Nginx)
FROM nginx:alpine

# Build çıktısını kopyala
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Nginx konfigürasyonu (SPA için)
RUN echo 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]