FROM oven/bun:latest AS builder

WORKDIR /app

# Tüm kodu kopyala
COPY . .

# Install
RUN bun install

# Web'i build et
WORKDIR /app/apps/web
RUN bun run build

FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN echo 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]