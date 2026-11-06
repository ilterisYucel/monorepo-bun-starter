// Saha → EMS config export.
//
// Simülatörün ayağa kaldırdığı her cihaz için, EMS'in (device-service) TCP ile okuyacağı
// device-config'i üretir: register listesi kök `configs/` ile aynıdır; yalnız deviceId,
// name ve connection (host = EMS'in simülatöre eriştiği adres, port = cihaz portu) değişir.
// `transport` alanı YOKTUR → device-service kendi SimulatorHost'unu açmaz, gerçek cihaz
// gibi TCP okur. BSC `connector.device` (izleme cihazı) korunur, `connector.sim` silinir.
//
// Çıktı (deployment/simlab/<site>/):
//   container-<n>/device-configs/*.json + service.json
//   container-<n>/docker-compose.simlab.yml   (v2 container compose'una overlay)
//   field/device-configs/pcs-*.json, <mv>.json + service.json
//   field/topology.json                       (istasyon/fider/PCS eşlemesi)
//   field/docker-compose.simlab.yml           (v2 field compose'una overlay)
//   README.md

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { SiteDevice, SiteModel } from "./site-config";

export interface ExportResult {
  outDir: string;
  files: string[];
}

const FILE_NAMES: Partial<Record<SiteDevice["type"], (d: SiteDevice) => string>> = {
  bsc: (d) => `bsc-${d.index}.json`,
  hvac: (d) => `hvac-${d.index}.json`,
  cb: (d) => `cb-${d.index}.json`,
  "dc-meter": () => "dc-meter-1.json",
  "dc-output": (d) => `dc-output-${d.index}.json`,
  "energy-analyzer": () => "pm5340-1.json",
  imd: () => "imd-1.json",
  fss: () => "fss-1.json",
  "control-panel-io": () => "control-panel-io-1.json",
  "wattox-pcs": (d) => `pcs-${d.index}.json`,
  "demo-mv-station": (d) => `${d.deviceId.toLowerCase()}.json`,
};

export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function emsConfig(d: SiteDevice): Record<string, unknown> {
  const c = structuredClone(d.config) as unknown as Record<string, unknown>;
  delete c["file"];
  delete c["dir"];
  delete c["transport"];
  delete c["details"];
  const conn = c["connector"] as { device?: unknown; sim?: unknown } | undefined;
  if (conn) {
    delete conn.sim;
    if (!conn.device) delete c["connector"];
  }
  return c;
}

/** Overlay compose: v2 compose'undaki device-configs mount'unu simlab dizinine çevirir. */
function composeOverlay(tier: "container" | "field", rel: string, containerIndex?: number): string {
  const target = tier === "container" ? "/app/config-docker" : "/app/config-field";
  const svcs = tier === "container" ? ["container-device-service", "container-management-service", "container-web-service"] : ["field-device-service", "field-management-service", "field-web-service"];
  const lines = [
    `# Sim-Lab overlay — v2 ${tier} stack'ini Sim-Lab'ın ${tier === "container" ? `konteyner ${containerIndex}` : "saha"} cihazlarına bağlar.`,
    "# Kullanım (repo kökünden):",
    `#   docker compose --env-file deployment/v2/dev/${tier}/.env \\`,
    `#     -f deployment/v2/dev/${tier}/docker-compose.yml \\`,
    `#     -f ${rel}/docker-compose.simlab.yml up -d --build`,
    "# Göreli yollar ilk compose dosyasının dizinine (deployment/v2/dev/<tier>) göredir.",
    "services:",
  ];
  const rel2 = relative(`deployment/v2/dev/${tier}`, rel).replace(/\\/g, "/");
  for (const s of svcs) {
    lines.push(`  ${s}:`);
    if (s.endsWith("device-service")) {
      lines.push("    environment:");
      if (tier === "container") lines.push(`      CONTAINER_ID: container-${containerIndex}`);
      lines.push("      DEBUG_INJECT_ENABLED: \"false\"");
      lines.push("    extra_hosts:");
      lines.push('      - "host.docker.internal:host-gateway"');
    }
    lines.push("    volumes:");
    lines.push(`      - ${rel2}/device-configs:${target}:ro`);
    if (tier === "field" && s === "field-web-service") lines.push(`      - ${rel2}/topology.json:/app/config/topology.json:ro`);
  }
  return lines.join("\n") + "\n";
}

export function exportEmsConfigs(model: SiteModel, repoRoot: string, outDirRel?: string): ExportResult {
  const slug = slugOf(model.spec.name);
  const outRel = outDirRel ?? `deployment/simlab/${slug}`;
  const outDir = join(repoRoot, outRel);
  const files: string[] = [];
  const write = (rel: string, content: string): void => {
    const p = join(outDir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
    files.push(join(outRel, rel));
  };
  const servicePath = join(model.templatesDir, "service.json");
  const service = existsSync(servicePath) ? readFileSync(servicePath, "utf-8") : "{}\n";

  for (let c = 1; c <= model.spec.containers.count; c++) {
    const dir = `container-${c}`;
    for (const d of model.devices.filter((x) => x.scope === "container" && x.container === c)) {
      const fn = FILE_NAMES[d.type]?.(d);
      if (!fn) continue;
      write(`${dir}/device-configs/${fn}`, JSON.stringify(emsConfig(d), null, 2) + "\n");
    }
    write(`${dir}/device-configs/service.json`, service);
    write(`${dir}/docker-compose.simlab.yml`, composeOverlay("container", `${outRel}/${dir}`, c));
  }
  for (const d of model.devices.filter((x) => x.scope === "field")) {
    const fn = FILE_NAMES[d.type]?.(d);
    if (!fn) continue;
    const cfg = emsConfig(d);
    if (d.type === "wattox-pcs" && d.feeder) cfg["details"] = { gridLink: { deviceId: d.feeder.station, feeder: d.feeder.cell } };
    write(`field/device-configs/${fn}`, JSON.stringify(cfg, null, 2) + "\n");
  }
  write("field/device-configs/service.json", service);
  // topology.json — v2 field formatı (istasyon → fider → üniteler, konteynerler, PCS'ler)
  const stations = model.spec.mv.stations.map((st, i) => {
    const feeders: Record<string, { cell: string; units: number[] }> = {};
    Object.entries(st.feeders).forEach(([cell, units], j) => (feeders[String.fromCharCode(65 + j)] = { cell, units }));
    const units = [...new Set(Object.values(st.feeders).flat())].sort((a, b) => a - b);
    const pcs = model.devices.filter((d) => d.type === "wattox-pcs" && d.feeder?.station === st.id).map((d) => d.key);
    return { key: `bess${i + 1}`, name: st.name ?? st.id, feeders, units, containers: units.map((u) => `container-${u}`), pcs, mvDeviceId: st.id };
  });
  write("field/topology.json", JSON.stringify({ stations }, null, 2) + "\n");
  write("field/docker-compose.simlab.yml", composeOverlay("field", `${outRel}/field`));
  write("README.md", readme(model, outRel));
  return { outDir: outRel, files };
}

function readme(model: SiteModel, outRel: string): string {
  const s = model.spec;
  const net = s.network;
  const rows = model.devices
    .filter((d) => d.type === "bsc" || d.type === "wattox-pcs" || d.type === "demo-mv-station" || (d.type === "hvac" && d.index === 1))
    .map((d) => `| ${d.key} | ${d.deviceId} | ${d.type} | ${d.port}${d.bmsPort ? ` (BMS ${d.bmsPort})` : ""}${d.connector ? ` (konnektör ${d.connector.port})` : ""} |`);
  return `# Sim-Lab EMS config'leri — ${s.name}

> Otomatik üretildi (\`bun run apps/sim-lab/src/tools/export-ems-config.ts\`). Elle düzenlemeyin;
> site dosyasını değiştirip yeniden üretin. Register listeleri kök \`configs/\` ile birebir aynıdır.

${s.description ?? ""}

- Konteyner: ${s.containers.count} × (${s.containers.bscPerContainer} BSC × ${s.containers.racksPerBsc} raf, ${s.containers.hvacPerContainer} HVAC)
- PCS: ${model.devices.filter((d) => d.type === "wattox-pcs").length} (BSC başına 1)
- EMS → simülatör adresi: \`${net.emsHost}\` (docker içinden host makine)
- Port şeması: konteyner *n* için taban \`${net.containerPortBase} + (n−1)×${net.containerPortStride}\`; BSC-b +b, konnektör-b +5+b, HVAC-h +10+h, CB-b +30+b, DC metre +41, DC çıkış-k +41+k, PM5340 +51, IMD +52, FSS +53, panel IO +54. Saha: PCS-n \`${net.fieldPortBase}+n\` (BMS yüzü +100+n), OG köşk \`${net.fieldPortBase}+201\`.

## Kullanım

1. Sim-Lab'ı başlatın: \`bun run apps/sim-lab/src/main.ts --site apps/sim-lab/sites/<site>.site.json\`
2. Saha (field) stack'ini overlay ile kaldırın:
   \`docker compose --env-file deployment/v2/dev/field/.env -f deployment/v2/dev/field/docker-compose.yml -f ${outRel}/field/docker-compose.simlab.yml up -d --build\`
3. Bir konteyner stack'ini overlay ile kaldırın (ör. konteyner 1):
   \`docker compose --env-file deployment/v2/dev/container/.env -f deployment/v2/dev/container/docker-compose.yml -f ${outRel}/container-1/docker-compose.simlab.yml up -d --build\`

Not: v2 container compose'u sabit \`container_name\` kullandığı için aynı makinede aynı anda tek konteyner stack'i çalışır; diğer konteynerlerin cihazları Sim-Lab'da yine çalışır (EMS'siz) ve arayüzden izlenir.

## Örnek cihazlar

| Anahtar | deviceId | Tip | Port |
| :--- | :--- | :--- | :--- |
${rows.join("\n")}
`;
}
