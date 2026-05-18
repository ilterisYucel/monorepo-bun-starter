# Stage 1: Builder
FROM oven/bun:latest AS builder

WORKDIR /app

# Önce root package.json'ı kopyala
COPY package.json ./
COPY bun.lock* ./

# Sadece root'da install yap (workspace'leri görmesi için)
RUN bun install

# Şimdi workspace'teki tüm paketlerin node_modules'ları root'da hoist edilecek
COPY apps/demo-backend/package.json apps/demo-backend/
COPY packages/core/package.json packages/core/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/simulators/package.json packages/simulators/

# Tekrar install et (bu sefer workspace'ler de tanınacak)
RUN bun install

# Kaynak kodları kopyala
COPY tsconfig.base.json ./
COPY apps/demo-backend/ apps/demo-backend/
COPY packages/core/ packages/core/
COPY packages/shared-types/ packages/shared-types/
COPY packages/simulators/ packages/simulators/

# Build al
RUN bun run build

# Stage 2: Production
FROM oven/bun:latest AS runner

WORKDIR /app

# Build çıktısını kopyala
COPY --from=builder /app/apps/demo-backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 🔥 Monorepo'daki workspace bağlantılarını koru
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# 🔥 Bun ile çalıştır
CMD ["bun", "dist/index.js"]