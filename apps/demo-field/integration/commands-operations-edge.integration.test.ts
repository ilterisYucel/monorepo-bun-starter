import { describe, it, expect, beforeAll } from "vitest";
import {
  FIELD_URL,
  CONTAINER_URL,
  assertHealthy,
  login,
  api,
  rawFetch,
  deviceRows,
  valueOf,
  normalizeStack,
  sleep,
  modbusRead,
} from "./helpers";

/**
 * Komut / operasyon / manevra EDGE-CASE entegrasyonu (v2/dev).
 * demo-field odaklı; paylaşımlı stack `beforeAll`'da normalize edilir.
 */

let fieldToken = "";
let containerToken = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  await assertHealthy(CONTAINER_URL);
  fieldToken = await login(FIELD_URL);
  containerToken = await login(CONTAINER_URL);
  await normalizeStack(fieldToken, containerToken);
  await sleep(3000);
});

const cExecute = (body: Record<string, unknown>) =>
  api(CONTAINER_URL, containerToken, "/api/commands/execute", {
    method: "POST",
    body: JSON.stringify(body),
  });
const fExecute = (body: Record<string, unknown>) =>
  api(FIELD_URL, fieldToken, "/api/commands/execute", {
    method: "POST",
    body: JSON.stringify(body),
  });
const fOperation = (name: string, body: Record<string, unknown> = {}) =>
  api(FIELD_URL, fieldToken, `/api/operations/${name}/execute`, {
    method: "POST",
    body: JSON.stringify(body),
  });

async function waitFor(fn: () => Promise<boolean>, timeoutMs: number, intervalMs = 1500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) return true;
    await sleep(intervalMs);
  }
  return false;
}

describe("B1 — komut katmanı edge-case'ler", () => {
  it("bilinmeyen cihaz → 404", async () => {
    expect((await cExecute({ deviceId: "YOK-1", command: "stop" })).status).toBe(404);
  });

  it("bilinmeyen komut → 404", async () => {
    expect((await cExecute({ deviceId: "BSC-1", command: "yok_boyle_komut" })).status).toBe(404);
  });

  it("eksik zorunlu param → 400", async () => {
    expect((await fExecute({ deviceId: "PCS-1", command: "charge" })).status).toBe(400);
  });

  it("raw telemetries komutu → 200", async () => {
    const r = await cExecute({
      deviceId: "BSC-1",
      telemetries: [{ name: "Controller Heartbeat", value: 10 }],
    });
    expect(r.status).toBe(200);
    expect((r.body as { success?: boolean }).success).toBe(true);
  });

  it("benign ack: zaten Normal iken Start → success (0x06 kabul)", async () => {
    const r = await cExecute({ deviceId: "BSC-1", command: "start" });
    expect([200, 202]).toContain(r.status);
    const body = r.body as { success?: boolean; validated?: boolean };
    expect(body.success).toBe(true);
    expect(body.validated).toBe(true);
  });

  it("pulse: CB-1 open sonrası coil serbest kalır (0)", async () => {
    const r = await cExecute({ deviceId: "CB-1", command: "open" });
    expect([200, 202]).toContain(r.status);
    const ok = await waitFor(async () => valueOf(await deviceRows(CONTAINER_URL, containerToken, "CB-1"), "Open") === 0, 15000);
    expect(ok).toBe(true);
    await cExecute({ deviceId: "CB-1", command: "close" });
  });

  it("execute-multi onFailure=stop: ilk adım hata → ikinci atlanır", async () => {
    const r = await api(CONTAINER_URL, containerToken, "/api/commands/execute-multi", {
      method: "POST",
      body: JSON.stringify({
        commands: [
          { deviceId: "YOK-1", command: "stop" },
          { deviceId: "BSC-1", command: "stop" },
        ],
        mode: "sequential",
        onFailure: "stop",
      }),
    });
    expect([200, 422]).toContain(r.status);
    const results = (r.body as { results?: unknown[] }).results ?? [];
    expect(results).toHaveLength(1);
  });
});

describe("B2 — operasyon katmanı edge-case'ler", () => {
  it("bilinmeyen operasyon → 404", async () => {
    expect((await fOperation("yok_boyle_op")).status).toBe(404);
  });

  it("divideTotal floor: charge powerKw=25 → PCS-1 S06 = -12 kW", async () => {
    const r = await fOperation("charge", { params: { powerKw: 25 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(r.status);
    // PCS-1 EMS S06 (0x0e19 = 3609, sint16 kW): 25/2 = 12.5 → 12 kW, şarj negatif.
    const ok = await waitFor(async () => {
      const raw = (await modbusRead(1502, 3, 3609, 1)).values[0] ?? 0;
      const signed = raw > 0x7fff ? raw - 0x10000 : raw;
      return signed === -12;
    }, 20000);
    expect(ok).toBe(true);
    await fOperation("standby");
  }, 60_000);

  it("timer: charge + 3 sn → PCS gücü 0'a iner", async () => {
    const r = await fOperation("charge", {
      params: { powerKw: 200 },
      deviceIds: ["PCS-1", "PCS-2"],
      timer: { durationSeconds: 3 },
    });
    expect([200, 202]).toContain(r.status);
    const ok = await waitFor(async () => {
      const rows = await deviceRows(FIELD_URL, fieldToken, "PCS-1");
      const p = rows.find((x) => x.tags?.canonical === "power_kw");
      return p ? Math.abs(Number(p.value)) < 1 : false;
    }, 20000);
    expect(ok).toBe(true);
    await fOperation("standby");
  }, 60_000);

  it("rollback: ulaşılamayan system → başarısız uzak adım + rollback", async () => {
    // UC-13: uzak adım hedefi `systems` ile seçilir; var olmayan container →
    // system_unreachable → rollback (önceden `field_charge`'ın container-2
    // adımı yoktu; container-2 artık gerçek — bu yüzden hedef açıkça seçilir).
    const r = await fOperation("charge", {
      params: { powerKw: 100 },
      deviceIds: ["PCS-1", "PCS-2"],
      systems: ["container-missing"],
    });
    expect([200, 422]).toContain(r.status);
    const outcomes = ((r.body as { outcomes?: Array<{ success?: boolean; system?: string; reason?: string }> }).outcomes ?? []);
    expect(outcomes.some((o) => o.success === false)).toBe(true);
    await fOperation("standby");
  }, 60_000);

  it("MV interlock: H01 toprak kalıcı kilitli (komut reddedilir)", async () => {
    const r = await fExecute({ deviceId: "DEMO-MV-1", command: "H01_earth_close" });
    const body = r.body as { success?: boolean; validated?: boolean };
    expect(r.status === 200 || r.status === 422 || r.status === 503 || body.success === false || body.validated === false).toBe(true);
    const rows = await deviceRows(FIELD_URL, fieldToken, "DEMO-MV-1");
    expect(valueOf(rows, "H01 Earth")).toBe(0);
  }, 40_000);
});

describe("B3 — manevra katmanı edge-case'ler", () => {
  it("bsc_recovery: Emergency → Normal (Stop→Start→EventClear→Close)", async () => {
    await cExecute({ deviceId: "BSC-1", command: "emergency" });
    const emergency = await waitFor(
      async () => valueOf(await deviceRows(CONTAINER_URL, containerToken, "BSC-1"), "BSC State") === 6,
      12000,
    );
    expect(emergency).toBe(true);

    const r = await api(CONTAINER_URL, containerToken, "/api/maneuvers/bsc_recovery/execute", {
      method: "POST",
      body: "{}",
    });
    expect([200, 202]).toContain(r.status);
    const normal = await waitFor(
      async () => valueOf(await deviceRows(CONTAINER_URL, containerToken, "BSC-1"), "BSC State") === 3,
      20000,
    );
    expect(normal).toBe(true);
  }, 60_000);

  it("bsc_stop idempotent: iki kez çalıştırılabilir", async () => {
    const r1 = await api(CONTAINER_URL, containerToken, "/api/maneuvers/bsc_stop/execute", { method: "POST", body: "{}" });
    const r2 = await api(CONTAINER_URL, containerToken, "/api/maneuvers/bsc_stop/execute", { method: "POST", body: "{}" });
    expect([200, 202]).toContain(r1.status);
    expect([200, 202]).toContain(r2.status);
    await normalizeStack(fieldToken, containerToken);
  }, 60_000);
});
