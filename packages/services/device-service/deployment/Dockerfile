FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock nx.json tsconfig.base.json ./
COPY apps/*/package.json apps/
COPY packages/*/package.json packages/
RUN bun install

COPY . .

WORKDIR /app/packages/services/device-service

ENV NODE_ENV=production
ENV DEVICE_CONFIG_DIR=/app/config-docker

CMD ["bun", "run.ts"]
