FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock nx.json tsconfig.base.json ./
COPY apps apps/
COPY packages packages/
COPY services services/
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN bun install

COPY . .

WORKDIR /app/services/device-service

ENV NODE_ENV=production
ENV DEVICE_CONFIG_DIR=/app/config-docker

CMD ["bun", "run.ts"]
