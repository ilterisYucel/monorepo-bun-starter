import { describe, it, expect, beforeAll } from "vitest";
import { FIELD_URL, api, assertHealthy, login, resolveFieldId } from "./helpers";

/**
 * UC-13 — istasyon bazlı operasyon yürütme (2 konteyner, ayrı ws-tunnel).
 *
 * Ön koşul: `bun run start:demo-integration` + `bun run register:demo-integration`.
 * İddia: uzak (`system`) adımlar, ön yüzün gönderdiği `systems` (container id)
 * ile **o istasyonun konteynerinde** yürür. bess1 → container-1, bess2 → container-2.
 * `standby` (yerel pcs_standby + uzak bsc_stop) hızlı/idempotent → hedef kanıtı.
 */

interface Row {
  deviceId: string;
  name: string;
  value: unknown;
}
interface ContainerRow {
  containerId: string;
  station?: string | null;
  connectionStatus: string;
  latestTelemetry: Row[];
}
interface Outcome {
  system?: string;
  maneuver?: string;
  success: boolean;
  reason?: string;
}

let token = "";
let fieldId = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  fieldId = resolveFieldId();
  token = await login(FIELD_URL);
});

async function containersByStation(): Promise<Record<string, ContainerRow>> {
  const { body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/containers`);
  const out: Record<string, ContainerRow> = {};
  for (const c of body as ContainerRow[]) if (c.station) out[c.station] = c;
  return out;
}

const standby = (systems: string[]) =>
  api(FIELD_URL, token, `/api/operations/standby/execute`, {
    method: "POST",
    body: JSON.stringify({ params: {}, deviceIds: ["PCS-1", "PCS-2"], systems }),
  });

const remoteOutcome = (body: unknown, maneuver: string): Outcome =>
  (body as { outcomes: Outcome[] }).outcomes.find((o) => o.maneuver === maneuver) as Outcome;

describe("UC-13 istasyon bazlı operasyon yürütme (2 konteyner)", () => {
  it("iki konteyner istasyon etiketli ve bağlı (bess1=container-1, bess2=container-2)", async () => {
    const bySt = await containersByStation();
    expect(bySt["bess1"]?.containerId).toBe("container-1");
    expect(bySt["bess2"]?.containerId).toBe("container-2");
    expect(bySt["bess1"].connectionStatus).toBe("connected");
    expect(bySt["bess2"].connectionStatus).toBe("connected");
  });

  it("bess1 standby → uzak bsc_stop container-1'de yürür", async () => {
    const r = await standby(["container-1"]);
    expect(r.status).toBe(200);
    const o = remoteOutcome(r.body, "bsc_stop");
    expect(o.system).toBe("container-1");
    expect(o.success).toBe(true);
  }, 60_000);

  it("bess2 standby → uzak bsc_stop container-2'de yürür", async () => {
    const r = await standby(["container-2"]);
    expect(r.status).toBe(200);
    const o = remoteOutcome(r.body, "bsc_stop");
    expect(o.system).toBe("container-2");
    expect(o.success).toBe(true);
  }, 60_000);

  it("systems verilmezse config varsayılanı (container-1) kullanılır (geriye dönük)", async () => {
    const r = await api(FIELD_URL, token, `/api/operations/standby/execute`, {
      method: "POST",
      body: JSON.stringify({ params: {}, deviceIds: ["PCS-1", "PCS-2"] }),
    });
    expect(r.status).toBe(200);
    expect(remoteOutcome(r.body, "bsc_stop").system).toBe("container-1");
  }, 60_000);
});
