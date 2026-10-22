# Hub-servis imajı — monorepo kök bağlamından derlenir:
#   docker build -f packages/ws-tunnel-hub/Dockerfile -t ws-tunnel-hub .
FROM oven/bun:1.4.3@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 AS build
WORKDIR /app

# Workspace bağımlılıklarını çöz (kök lockfile).
COPY package.json bun.lock ./
COPY packages/ws-tunnel/package.json packages/ws-tunnel/package.json
COPY packages/ws-tunnel-hub/package.json packages/ws-tunnel-hub/package.json
RUN bun install --frozen-lockfile

# Kaynakları kopyala ve hub-servis'i bundle et (bağımlılıklar gömülür).
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/ws-tunnel/src packages/ws-tunnel/src
COPY packages/ws-tunnel-hub packages/ws-tunnel-hub
RUN cd packages/ws-tunnel-hub && bun build src/main.ts --outdir dist --target bun

FROM oven/bun:1.4.3-slim@sha256:14a223fa35747ec728bce300ef85888bc5f7958164d15bbba6a54b22b52a3288
WORKDIR /app
# Self-signed TLS üretimi (HUB_TLS_ENABLED=1) için openssl.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/packages/ws-tunnel-hub/dist ./dist

ENV PORT=5003
ENV HUB_DB_PATH=/data/hub.db
EXPOSE 5003
VOLUME ["/data"]

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||5003)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "dist/main.js"]
