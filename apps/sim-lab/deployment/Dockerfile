# Sim-Lab — fiziksel saha simülatörü (Modbus TCP sunucuları + REST API + arayüz) imajı.
# Build bağlamı repo köküdür:
#   docker build -f apps/sim-lab/deployment/Dockerfile -t gd-sim-lab .
# Site dosyası ve register şablonları runtime'da deployment klasöründen mount edilir
# (deployment/v2/dev/simulator-app/{sites,device-configs}).
FROM oven/bun:1.4.3@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598

WORKDIR /app

COPY package.json bun.lock nx.json tsconfig.base.json ./
COPY apps apps/
COPY packages packages/
COPY services services/
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 PUPPETEER_SKIP_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install

COPY . .

ENV NODE_ENV=production \
    SIM_SITE=/sim/sites/gd1.site.json \
    SIM_PROFILE=uyumlu \
    SIM_SPEED=1 \
    SIM_EMS_HOST=host.docker.internal

# 8090: arayüz + REST API. Modbus portları site dosyasının port şemasından gelir.
EXPOSE 8090

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:8090/api/meta').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Mount edilen site dosyası yoksa (örn. Docker Desktop'ın paylaşamadığı Google Drive / ağ sürücüsü)
# imaja gömülü apps/sim-lab/sites kopyasına düşülür (register şablonları: imajdaki configs/).
CMD ["sh", "-c", "if [ ! -f \"$SIM_SITE\" ]; then echo \"[sim-lab] UYARI: $SIM_SITE okunamadı (mount boş?) — imajdaki apps/sim-lab/sites kullanılıyor\"; SIM_SITE=\"/app/apps/sim-lab/sites/$(basename \"$SIM_SITE\")\"; fi; exec bun run apps/sim-lab/src/main.ts --site \"$SIM_SITE\" --profile \"$SIM_PROFILE\" --speed \"$SIM_SPEED\" --http 8090 --bind 0.0.0.0 --ems-host \"$SIM_EMS_HOST\""]
