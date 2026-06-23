FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock nx.json tsconfig.base.json ./
COPY apps/*/package.json apps/
COPY packages/*/package.json packages/
RUN bun install

COPY . .

WORKDIR /app/packages/services/data-service

ENV NODE_ENV=production

CMD ["bun", "run.ts"]
