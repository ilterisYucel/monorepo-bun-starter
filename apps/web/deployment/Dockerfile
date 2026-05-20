FROM oven/bun:latest AS builder

ARG VITE_API_URL=http://localhost:3000

WORKDIR /app
COPY . .
RUN bun install
WORKDIR /app/apps/web

ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Basit nginx - SADECE STATİK DOSYA
RUN echo 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]