FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock nx.json tsconfig.base.json ./
COPY apps apps/
COPY packages packages/
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN bun install

COPY . .

WORKDIR /app/packages/services/web-service

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["bun", "run.ts"]
