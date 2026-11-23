import { describe, it, expect, beforeAll } from "vitest";
import {
  CONTAINER2_INJECT_URL,
  CONTAINER3_INJECT_URL,
  CONTAINER3_URL,
  normalizeContainer,
  CONTAINER_URL,
  FIELD_URL,
  api,
  assertHealthy,
  ensureStackReady,
  inject,
  login,
  resolveFieldId,
  sleep,
} from "../helpers";

/**
 * UC-13 — istasyon→konteyner eşlemesi (gerçek v2/dev stack).
 *
 * Eşleme artık hub'da değil **EMS topolojisinde** (`GET /fields/:id/topology`):
 * bess1 → container-1/2, bess2 → container-3/4 (her konteyner ayrı fiderde). Konteynerler hub peer'ı olarak
 * otomatik bağlanır (register adımı yok).
 * Ön koşul: `bun run dev:stack:up`.
 */

interface ContainerRow {
  containerId: string;
  connectionStatus: string;
  latestTelemetry: Array<{ deviceId: string; name: string; value: unknown }>;
}

interface TopologyStation {
  key: string;
  containers: string[];
  feeders: Record<string, { cell: string; units: number[] }>;
}

async function topology(): Promise<TopologyStation[]> {
  const { status, body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/topology`);
  expect(status).toBe(200);
  return (body as { stations: TopologyStation[] }).stations;
}

const maxPack = (
  rows: ContainerRow["latestTelemetry"],
  deviceId: string,
  name = "Max Pack Temp",
): number[] =>
  rows.filter((r) => r.deviceId === deviceId && r.name === name).map((r) => Number(r.value));

let token = "";
let fieldId = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  fieldId = resolveFieldId();
  token = await login(FIELD_URL);
  const containerToken = await login(CONTAINER_URL);
  await ensureStackReady(token, containerToken);
});

describe("UC-13 station-tagged konteynerler", () => {
  it("topoloji 2 istasyon × 2 konteyner tanımlar; hepsi connected + telemetri akıyor", async () => {
    const stations = await topology();
    expect(stations.map((s) => s.key)).toEqual(["bess1", "bess2"]);
    const byKey = Object.fromEntries(stations.map((s) => [s.key, s.containers]));
    expect(byKey["bess1"]).toEqual(["container-1", "container-2"]);
    expect(byKey["bess2"]).toEqual(["container-3", "container-4"]);

    // Her istasyonun konteynerleri ayrı fider hücresinde olmalı (2 fider/istasyon).
    const cells = stations.flatMap((s) => Object.values(s.feeders).map((f) => f.cell));
    expect(new Set(cells).size).toBe(cells.length);

    const { status, body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/containers`);
    expect(status).toBe(200);
    const byId = Object.fromEntries((body as ContainerRow[]).map((c) => [c.containerId, c]));
    for (const id of byKey["bess1"]!.concat(byKey["bess2"]!)) {
      expect(byId[id!]!.connectionStatus).toBe("connected");
      expect(byId[id!]!.latestTelemetry.length).toBeGreaterThan(0);
    }
  });

  it("veri istasyon-bazlı ayrışır: c3 BSC-1 sensör arızası → bess2 Raf1 127 °C, bess1 nominal", async () => {
    // Hedef konteynerin kendi ön koşulu: BSC Normal + kontaktörler kapalı (raflar online).
    // Aksi halde raf sensörü enjeksiyonu telemetriye yansımaz (sıra bağımlılığı olmasın).
    await normalizeContainer(
      await login(CONTAINER3_URL),
      CONTAINER3_URL,
      CONTAINER3_INJECT_URL,
    );
    expect(await inject(CONTAINER3_INJECT_URL, "BSC-1", "diff_temp")).toBe(true);
    // Enjeksiyon 5–20 s'de telemetriye yansır → koşul polling'i (sabit bekleme yerine).
    let byId: Record<string, ContainerRow> = {};
    for (let i = 0; i < 20; i++) {
      await sleep(2_000);
      const { body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/containers`);
      byId = Object.fromEntries((body as ContainerRow[]).map((c) => [c.containerId, c]));
      if (maxPack(byId["container-3"]?.latestTelemetry ?? [], "BSC-1", "Rack Max Pack Temp R1")[0] > 100) break;
    }
    // Sensör arızası raf düzeyinde görünür (BSC toplu Max Pack Temp sensör değerini taşımaz).
    const b1 = maxPack(byId["container-1"]!.latestTelemetry, "BSC-1", "Rack Max Pack Temp R1");
    const b2 = maxPack(byId["container-3"]!.latestTelemetry, "BSC-1", "Rack Max Pack Temp R1");
    expect(b2[0]).toBeGreaterThan(100); // sensör açık devre → 127 °C
    expect(b1[0]).toBeLessThan(60); // nominal (ortam sıcaklığı dalgalanır; 127'nin çok altında)
    await inject(CONTAINER3_INJECT_URL, "BSC-1", "nominal");
    await sleep(2_000);
  });
});
