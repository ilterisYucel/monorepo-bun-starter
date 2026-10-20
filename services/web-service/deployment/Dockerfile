FROM oven/bun:1.4.3@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598

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
