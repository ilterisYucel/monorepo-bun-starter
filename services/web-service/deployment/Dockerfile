FROM oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4

WORKDIR /app

COPY package.json bun.lock nx.json tsconfig.base.json ./
COPY apps apps/
COPY packages packages/
COPY services services/
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 PUPPETEER_SKIP_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install
RUN mkdir -p /var/log/gd-pms

COPY . .

WORKDIR /app/services/web-service

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["bun", "run.ts"]
