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
 * UC-13 — station-tagged konteynerler (gerçek v2/dev stack).
 *
 * field'e 2 konteyner kayıtlı olmalı (container-1 bess1, container-2 bess2).
 * Ön koşul: `bun run start:demo-integration` + `bun run register:demo-integration`.
 */

interface ContainerRow {
  containerId: string;
  station?: string | null;
  connectionStatus: string;
  latestTelemetry: Array<{ deviceId: string; name: string; value: unknown }>;
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
  it("2 konteyner station etiketli + connected + telemetri akıyor", async () => {
    const { status, body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/containers`);
    expect(status).toBe(200);
    const arr = body as ContainerRow[];
    const byStation = Object.fromEntries(arr.map((c) => [String(c.station), c]));
    expect(byStation["bess1"]).toBeTruthy();
    expect(byStation["bess2"]).toBeTruthy();
    for (const key of ["bess1", "bess2"]) {
      expect(byStation[key].connectionStatus).toBe("connected");
      expect(byStation[key].latestTelemetry.length).toBeGreaterThan(0);
    }
  });

  it("veri istasyon-bazlı ayrışır: c2 BSC-1 overheat → bess2 ~80, bess1 nominal", async () => {
    expect(await inject(CONTAINER2_INJECT_URL, "BSC-1", "overheat")).toBe(true);
    await sleep(16_000);
    const { body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/containers`);
    const arr = body as ContainerRow[];
    const byStation = Object.fromEntries(arr.map((c) => [String(c.station), c]));
    const b1 = maxPack(byStation["bess1"].latestTelemetry, "BSC-1");
    const b2 = maxPack(byStation["bess2"].latestTelemetry, "BSC-1");
    expect(b2[0]).toBeGreaterThan(50); // enjekte edilen ~80 °C
    expect(b1[0]).toBeLessThan(30); // nominal
    await inject(CONTAINER2_INJECT_URL, "BSC-1", "nominal");
    await sleep(2_000);
  });
});
