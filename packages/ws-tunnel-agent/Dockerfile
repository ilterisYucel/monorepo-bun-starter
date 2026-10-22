# ws-tunnel agent imajı — monorepo kök bağlamından derlenir:
#   docker build -f packages/ws-tunnel-agent/Dockerfile -t ws-tunnel-agent .
FROM oven/bun:1.4.3@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/ws-tunnel/package.json packages/ws-tunnel/package.json
COPY packages/ws-tunnel-agent/package.json packages/ws-tunnel-agent/package.json
RUN bun install --frozen-lockfile

COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/ws-tunnel/src packages/ws-tunnel/src
COPY packages/ws-tunnel-agent packages/ws-tunnel-agent

# Hedef mimariye göre tek dosya binary (TARGETARCH: amd64 | arm64).
ARG TARGETARCH
RUN arch=$( [ "$TARGETARCH" = "arm64" ] && echo arm64 || echo x64 ) \
    && cd packages/ws-tunnel-agent \
    && bun build --compile --target=bun-linux-${arch} src/cli.ts --outfile /out/agent

FROM debian:bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /out/agent /usr/local/bin/agent

ENV AGENT_CONFIG=/etc/agent/agent.env
EXPOSE 8080
VOLUME ["/etc/agent"]

ENTRYPOINT ["agent"]
CMD ["run"]
