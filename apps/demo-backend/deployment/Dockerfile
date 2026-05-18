# Stage 1: Builder
FROM oven/bun:latest AS builder

WORKDIR /app

# Monorepo yapısını kopyala
COPY package.json bun.lock ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Workspace'lerin package.json'larını kopyala
COPY apps/demo-backend/package.json apps/demo-backend/
COPY packages/core/package.json packages/core/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/simulators/package.json packages/simulators/

# 🔥 Nx'i yükle
RUN bun install

# Kaynak kodları kopyala
COPY apps/demo-backend/ apps/demo-backend/
COPY packages/ packages/

# 🔥 Nx ile build et (dependency sıralamasını Nx yönetecek)
RUN bun run build

# Stage 2: Production
FROM oven/bun:latest AS runner

WORKDIR /app

# Build çıktılarını kopyala
COPY --from=builder /app/apps/demo-backend/dist ./apps/demo-backend/dist
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=builder /app/packages/simulators/dist ./packages/simulators/dist

# Runtime bağımlılıkları
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Workspace package.json'ları (runtime'da gerekebilir)
COPY --from=builder /app/apps/demo-backend/package.json ./apps/demo-backend/package.json
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

WORKDIR /app/apps/demo-backend
CMD ["bun", "dist/index.js"]