import { describe, it, expect, beforeAll } from "vitest";
import {
  CONTAINER2_INJECT_URL,
  FIELD_URL,
  api,
  assertHealthy,
  inject,
  login,
  resolveFieldId,
  sleep,
} from "./helpers";

/**
 * UC-13 — istasyon→konteyner eşlemesi (gerçek v2/dev stack).
 *
 * Eşleme artık hub'da değil **EMS topolojisinde** (`GET /fields/:id/topology`):
 * bess1 → container-1, bess2 → container-2. Konteynerler hub peer'ı olarak
 * otomatik bağlanır (register adımı yok).
 * Ön koşul: `bun run start:demo-integration`.
 */

interface ContainerRow {
  containerId: string;
  connectionStatus: string;
  latestTelemetry: Array<{ deviceId: string; name: string; value: unknown }>;
}

interface TopologyStation {
  key: string;
  containers: string[];
}

async function topology(): Promise<TopologyStation[]> {
  const { status, body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/topology`);
  expect(status).toBe(200);
  return (body as { stations: TopologyStation[] }).stations;
}

const maxPack = (rows: ContainerRow["latestTelemetry"], deviceId: string): number[] =>
  rows.filter((r) => r.deviceId === deviceId && r.name === "Max Pack Temp").map((r) => Number(r.value));

let token = "";
let fieldId = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  fieldId = resolveFieldId();
  token = await login(FIELD_URL);
});

describe("UC-13 station-tagged konteynerler", () => {
  it("topoloji 2 istasyon + konteynerleri tanımlar; ikisi de connected + telemetri akıyor", async () => {
    const stations = await topology();
    expect(stations.map((s) => s.key).sort()).toEqual(["bess1", "bess2"]);
    const byKey = Object.fromEntries(stations.map((s) => [s.key, s.containers[0]]));
    expect(byKey["bess1"]).toBe("container-1");
    expect(byKey["bess2"]).toBe("container-2");

    const { status, body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/containers`);
    expect(status).toBe(200);
    const byId = Object.fromEntries((body as ContainerRow[]).map((c) => [c.containerId, c]));
    for (const id of [byKey["bess1"], byKey["bess2"]]) {
      expect(byId[id!]!.connectionStatus).toBe("connected");
      expect(byId[id!]!.latestTelemetry.length).toBeGreaterThan(0);
    }
  });

  it("veri istasyon-bazlı ayrışır: c2 BSC-1 overheat → bess2 ~80, bess1 nominal", async () => {
    expect(await inject(CONTAINER2_INJECT_URL, "BSC-1", "overheat")).toBe(true);
    await sleep(16_000);
    const { body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/containers`);
    const byId = Object.fromEntries((body as ContainerRow[]).map((c) => [c.containerId, c]));
    const b1 = maxPack(byId["container-1"]!.latestTelemetry, "BSC-1");
    const b2 = maxPack(byId["container-2"]!.latestTelemetry, "BSC-1");
    expect(b2[0]).toBeGreaterThan(50); // enjekte edilen ~80 °C
    expect(b1[0]).toBeLessThan(30); // nominal
    await inject(CONTAINER2_INJECT_URL, "BSC-1", "nominal");
    await sleep(2_000);
  });
});
