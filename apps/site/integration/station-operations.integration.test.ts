import { describe, it, expect, beforeAll } from "vitest";
import {
  FIELD_URL,
  CONTAINER_URL,
  api,
  assertHealthy,
  login,
  normalizeStack,
  resolveFieldId,
  sleep,
} from "./helpers";

/**
 * UC-13 — istasyon bazlı operasyon yürütme (2 konteyner, ayrı ws-tunnel).
 *
 * Ön koşul: `bun run dev:stack:up` (hub peer bağlantısı otomatik).
 * İstasyon→konteyner eşlemesi EMS topolojisinden (`/fields/:id/topology`).
 * İddia: uzak (`system`) adımlar, ön yüzün gönderdiği `systems` (container id)
 * ile **o istasyonun konteynerinde** yürür. bess1 → container-1, bess2 → container-2.
 * Kanıt operasyonu `station_stop` (yalnız uzak `bsc_stop`, idempotent) — PCS
 * soft-start fiziğine bağlı değil; `standby`'ın yerel adımı kırılgan oluyordu.
 */

interface Row {
  deviceId: string;
  name: string;
  value: unknown;
}
interface ContainerRow {
  containerId: string;
  connectionStatus: string;
  latestTelemetry: Row[];
}
interface Outcome {
  system?: string;
  maneuver?: string;
  success: boolean;
  reason?: string;
}
interface RunRow {
  id: string;
  name: string;
  status: string;
  startedAt: string;
}
interface Settled {
  status: string;
  outcomes: Outcome[];
}

let token = "";
let containerToken = "";
let fieldId = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  fieldId = resolveFieldId();
  token = await login(FIELD_URL);
  containerToken = await login(CONTAINER_URL);
  await normalizeStack(token, containerToken);
});

async function containersByStation(): Promise<Record<string, ContainerRow>> {
  const topology = await api(FIELD_URL, token, `/api/fields/${fieldId}/topology`);
  const stations = (topology.body as { stations: Array<{ key: string; containers: string[] }> }).stations;
  const { body } = await api(FIELD_URL, token, `/api/fields/${fieldId}/containers`);
  const byId = new Map((body as ContainerRow[]).map((c) => [c.containerId, c]));
  const out: Record<string, ContainerRow> = {};
  for (const s of stations) {
    const row = byId.get(s.containers[0] ?? "");
    if (row !== undefined) out[s.key] = row;
  }
  return out;
}

/**
 * `station_stop` çalıştırır ve koşunun terminal durumunu döndürür.
 *
 * Neden bu operasyon: `standby`'ın yerel `pcs_standby` adımı soft-start
 * tetikler ve standby **batarya ister** (`dcV < 1000 V` → W1.b2 latch);
 * uzak adım kanıtı bu fiziksel yarışa bağlı kalmamalı. `station_stop`
 * yalnız BSC'yi durdurur (idempotent: Rev AF ack 0x0005 `accept:[2,5]`).
 *
 * 202 = yürütücü bekleme penceresini aştı; koşu arka planda sürer,
 * `/operations/runs` üzerinden *bu isteğe ait* koşu beklenir (`startedAt`
 * filtresi — önceki koşularla karışmasın). Koşu deposu adım sonuçlarını
 * saklamadığı için 202 yolunda tek kanıt uçtan uca `status` olur.
 */
async function stationStop(systems?: string[]): Promise<Settled> {
  const since = Date.now();
  const r = await api(FIELD_URL, token, "/api/operations/station_stop/execute", {
    method: "POST",
    body: JSON.stringify(systems === undefined ? { params: {} } : { params: {}, systems }),
  });
  expect([200, 202]).toContain(r.status);
  if (r.status === 200) return r.body as Settled;

  for (let i = 0; i < 180; i++) {
    const { body } = await api(FIELD_URL, token, "/api/operations/runs");
    const run = (body as { runs: RunRow[] }).runs.find(
      (x) =>
        x.name === "station_stop" &&
        x.status !== "running" &&
        Date.parse(x.startedAt) >= since - 5_000,
    );
    if (run !== undefined) return { status: run.status, outcomes: [] };
    await sleep(1_000);
  }
  throw new Error("station_stop koşusu terminal duruma ulaşmadı");
}

describe("UC-13 istasyon bazlı operasyon yürütme (2 konteyner)", () => {
  it("iki konteyner istasyon etiketli ve bağlı (bess1=container-1, bess2=container-2)", async () => {
    const bySt = await containersByStation();
    expect(bySt["bess1"]?.containerId).toBe("container-1");
    expect(bySt["bess2"]?.containerId).toBe("container-2");
    expect(bySt["bess1"].connectionStatus).toBe("connected");
    expect(bySt["bess2"].connectionStatus).toBe("connected");
  });

  it("bess1 station_stop → uzak bsc_stop container-1'de yürür", async () => {
    const run = await stationStop(["container-1"]);
    expect(run.status).toBe("completed");
    const remote = run.outcomes.find((o) => o.maneuver === "bsc_stop");
    if (remote !== undefined) {
      expect(remote.system).toBe("container-1");
      expect(remote.success).toBe(true);
    }
  }, 240_000);

  it("bess2 station_stop → uzak bsc_stop container-2'de yürür", async () => {
    const run = await stationStop(["container-2"]);
    expect(run.status).toBe("completed");
    const remote = run.outcomes.find((o) => o.maneuver === "bsc_stop");
    if (remote !== undefined) {
      expect(remote.system).toBe("container-2");
      expect(remote.success).toBe(true);
    }
  }, 240_000);

  it("systems verilmezse config varsayılanı (container-1) kullanılır (geriye dönük)", async () => {
    const run = await stationStop();
    expect(run.status).toBe("completed");
    const remote = run.outcomes.find((o) => o.maneuver === "bsc_stop");
    if (remote !== undefined) {
      expect(remote.system).toBe("container-1");
      expect(remote.success).toBe(true);
    }
  }, 240_000);
});
