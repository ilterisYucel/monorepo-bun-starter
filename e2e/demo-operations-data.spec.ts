import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * demo-field OPERASYON veri kontrolü (SPEC UC-7/T-31 kapsam genişletmesi).
 *
 * Demo kataloğundaki genel operasyonların (charge/discharge/standby/calibration)
 * hem UZAK BSC adımını (tünel → konteyner) hem YEREL PCS adımını gerçekten
 * yürüttüğünü ve sonucun canlı telemetriye yansıdığını ölçer.
 *
 * Kanıt sinyalleri:
 * - PCS `Grid Active Power` işareti (charge < 0, discharge > 0) — `/api/data/PCS-1/latest`
 * - BSC-1 `Charge/Discharge Status` (1 = şarj, 2 = deşarj) — `/fields/:id/containers`
 * - `Rack SOC R1` yön değişimi (şarjda artar, deşarjda düşer) — kısa pencere
 * - run terminal `completed` + adım outcome'ları (uzak `bsc_*` dahil)
 *
 * Ön koşul: demo-integration stack; E2E_ADMIN_PASSWORD + FIELD_ID zorunlu.
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:8088";
const FIELD_ID = process.env.FIELD_ID || "";
const ADMIN = process.env.E2E_ADMIN_USER || "admin";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";

const BSC = "BSC-1";
const MV = "DEMO-MV-1";
const CD_CHARGE = 1;
const CD_DISCHARGE = 2;

type Vals = Record<string, unknown>;

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${FIELD_UI}/api/auth/login`, {
    data: { username: ADMIN, password: PASSWORD },
  });
  expect(res.ok(), `login başarısız (${res.status()}): ${await res.text()}`).toBe(true);
  const body = (await res.json()) as { accessToken?: string };
  expect(body.accessToken, "accessToken yok").toBeTruthy();
  return body.accessToken!;
}

interface Telemetry {
  deviceId?: string;
  name: string;
  value: unknown;
  timestamp?: string;
}

/**
 * Aynı isimden birden çok satır gelebilir (time-series `latest`); her isim için
 * EN YENİ timestamp'i seç — aksi halde bayat değer kazanır.
 */
function latestByName(rows: Telemetry[]): Vals {
  const best = new Map<string, { value: unknown; ts: number }>();
  for (const r of rows) {
    const ts = r.timestamp ? Date.parse(r.timestamp) || 0 : 0;
    const cur = best.get(r.name);
    if (!cur || ts >= cur.ts) best.set(r.name, { value: r.value, ts });
  }
  return Object.fromEntries([...best].map(([k, v]) => [k, v.value]));
}

async function pcs(request: APIRequestContext, token: string, id = "PCS-1"): Promise<Vals> {
  const res = await request.get(`${FIELD_UI}/api/data/${id}/latest?limit=500`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return {};
  const body = (await res.json()) as { telemetries?: Telemetry[] };
  return latestByName(body.telemetries ?? []);
}

async function bsc(request: APIRequestContext, token: string): Promise<Vals> {
  const res = await request.get(`${FIELD_UI}/api/fields/${FIELD_ID}/containers`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return {};
  const body = (await res.json()) as unknown;
  const list = (Array.isArray(body) ? body : (body as { containers?: unknown[] }).containers) ?? [];
  const c = list[0] as { latestTelemetry?: Telemetry[] } | undefined;
  const rows = (c?.latestTelemetry ?? []).filter((t) => t.deviceId === BSC);
  return latestByName(rows);
}

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

/** DEMO-MV istasyon telemetrisi (toprak ayırıcı durumları). */
async function mv(request: APIRequestContext, token: string): Promise<Vals> {
  const res = await request.get(`${FIELD_UI}/api/data/${MV}/latest?limit=500`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return {};
  const body = (await res.json()) as { telemetries?: Telemetry[] };
  return latestByName(body.telemetries ?? []);
}

/** MV hücre komutu (toprak aç/kapat). */
async function cmd(
  request: APIRequestContext,
  token: string,
  command: string,
): Promise<{ status: number; body: unknown }> {
  const res = await request.post(`${FIELD_UI}/api/commands/execute`, {
    headers: { authorization: `Bearer ${token}` },
    data: { deviceId: MV, command },
  });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

/** 2xx beklemeyen execute (interlock reddi 503 döner). */
async function postRaw(
  request: APIRequestContext,
  token: string,
  path: string,
  data: Vals,
): Promise<{ status: number; body: unknown }> {
  const res = await request.post(`${FIELD_UI}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    data,
  });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

interface Outcome {
  stepIndex: number;
  system?: string;
  deviceId?: string;
  maneuver?: string;
  command?: string;
  success: boolean;
}

async function exec(
  request: APIRequestContext,
  token: string,
  name: string,
  params: Vals = {},
  timer?: { durationSeconds: number },
): Promise<{ status: string; outcomes: Outcome[] }> {
  const res = await request.post(`${FIELD_UI}/api/operations/${name}/execute`, {
    headers: { authorization: `Bearer ${token}` },
    data: { params, ...(timer ? { timer } : {}) },
  });
  expect(res.ok(), `${name} başarısız (${res.status()}): ${await res.text()}`).toBe(true);
  return (await res.json()) as { status: string; outcomes: Outcome[] };
}

async function execManeuver(
  request: APIRequestContext,
  token: string,
  name: string,
  params: Vals = {},
): Promise<{ status: string; outcomes: Outcome[] }> {
  const res = await request.post(`${FIELD_UI}/api/maneuvers/${name}/execute`, {
    headers: { authorization: `Bearer ${token}` },
    data: { params },
  });
  expect(res.ok(), `${name} başarısız (${res.status()}): ${await res.text()}`).toBe(true);
  return (await res.json()) as { status: string; outcomes: Outcome[] };
}

test.describe("demo-field operasyon veri kontrolü (charge/discharge/standby/calibration)", () => {
  test.describe.configure({ timeout: 240_000 });

  test("charge: uzak BSC + yerel PCS yürür; güç negatif, BSC şarj, SOC artar", async ({ request }) => {
    expect(PASSWORD, "E2E_ADMIN_PASSWORD gerekli").toBeTruthy();
    expect(FIELD_ID, "FIELD_ID gerekli").toBeTruthy();
    const token = await login(request);

    const before = num((await bsc(request, token))["Rack SOC R1"]);
    const res = await exec(request, token, "charge", { powerKw: 100 });
    expect(res.status).toBe("completed");
    expect(res.outcomes.some((o) => o.system === "container-1" && o.success)).toBe(true);
    expect(res.outcomes.some((o) => o.maneuver === "pcs_charge" && o.success)).toBe(true);

    await expect
      .poll(
        async () => {
          const p = await pcs(request, token);
          const b = await bsc(request, token);
          const kw = num(p["Grid Active Power"]);
          const cd = num(b["Charge/Discharge Status"]);
          const soc = num(b["Rack SOC R1"]);
          if (kw === undefined || cd === undefined || soc === undefined) return "veri yok";
          const powerOk = kw < -5;
          const bscOk = cd === CD_CHARGE;
          const socOk = before === undefined ? true : soc > before;
          return powerOk && bscOk && socOk ? "ok" : `kw=${kw} cd=${cd} soc=${soc}`;
        },
        { timeout: 90_000, intervals: [2500] },
      )
      .toBe("ok");
  });

  test("discharge: güç pozitif, BSC deşarj, SOC düşer", async ({ request }) => {
    const token = await login(request);
    const before = num((await bsc(request, token))["Rack SOC R1"]);
    const res = await exec(request, token, "discharge", { powerKw: 100 });
    expect(res.status).toBe("completed");
    expect(res.outcomes.some((o) => o.system === "container-1" && o.success)).toBe(true);
    expect(res.outcomes.some((o) => o.maneuver === "pcs_discharge" && o.success)).toBe(true);

    await expect
      .poll(
        async () => {
          const p = await pcs(request, token);
          const b = await bsc(request, token);
          const kw = num(p["Grid Active Power"]);
          const cd = num(b["Charge/Discharge Status"]);
          const soc = num(b["Rack SOC R1"]);
          if (kw === undefined || cd === undefined || soc === undefined) return "veri yok";
          const powerOk = kw > 5;
          const bscOk = cd === CD_DISCHARGE;
          const socOk = before === undefined ? true : soc < before;
          return powerOk && bscOk && socOk ? "ok" : `kw=${kw} cd=${cd} soc=${soc}`;
        },
        { timeout: 90_000, intervals: [2500] },
      )
      .toBe("ok");
  });

  test("charge/discharge farklı güç: PCS başına floor(total/2) uygular", async ({ request }) => {
    const token = await login(request);
    const cases = [
      { op: "charge", powerKw: 60, sign: -1 },
      { op: "discharge", powerKw: 130, sign: 1 },
      { op: "charge", powerKw: 1000, sign: -1 },
      { op: "discharge", powerKw: 60, sign: 1 },
    ];
    for (const c of cases) {
      const expected = c.sign * Math.floor(c.powerKw / 2);
      const res = await exec(request, token, c.op, { powerKw: c.powerKw });
      expect(res.status).toBe("completed");
      await expect
        .poll(
          async () => {
            const p1 = num((await pcs(request, token, "PCS-1"))["Grid Active Power"]);
            const p2 = num((await pcs(request, token, "PCS-2"))["Grid Active Power"]);
            if (p1 === undefined || p2 === undefined) return "veri yok";
            return Math.abs(p1 - expected) <= 1 && Math.abs(p2 - expected) <= 1
              ? "ok"
              : `p1=${p1} p2=${p2} exp=${expected}`;
          },
          { timeout: 30_000, intervals: [2000] },
        )
        .toBe("ok");
    }
  });

  test("charge + timer: süre dolunca PCS otomatik durur", async ({ request }) => {
    const token = await login(request);
    const res = await exec(request, token, "charge", { powerKw: 100 }, { durationSeconds: 6 });
    expect(res.status).toBe("completed");

    // Şarj başlar (timer dolmadan yakala).
    await expect
      .poll(async () => num((await pcs(request, token))["Grid Active Power"]), {
        timeout: 4_500,
        intervals: [800],
      })
      .toBeLessThan(-5);

    // Timer stop → güç sıfıra döner.
    await expect
      .poll(
        async () => {
          const kw = num((await pcs(request, token))["Grid Active Power"]);
          if (kw === undefined) return "veri yok";
          return Math.abs(kw) < 5 ? "durdu" : `kw=${kw}`;
        },
        { timeout: 30_000, intervals: [1500] },
      )
      .toBe("durdu");
  });

  test("faults gerçek uca bağlı: /api/unified/alarms 200 + dizi döner", async ({ request }) => {
    const token = await login(request);
    const res = await request.get(`${FIELD_UI}/api/unified/alarms`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { alarms?: unknown[] };
    expect(Array.isArray(body.alarms)).toBe(true);
  });

  test("standby: PCS gücü sıfıra döner", async ({ request }) => {
    const token = await login(request);
    const res = await exec(request, token, "standby");
    expect(res.status).toBe("completed");

    await expect
      .poll(
        async () => {
          const kw = num((await pcs(request, token))["Grid Active Power"]);
          if (kw === undefined) return "veri yok";
          return Math.abs(kw) < 5 ? "ok" : `kw=${kw}`;
        },
        { timeout: 30_000, intervals: [2000] },
      )
      .toBe("ok");
  });

  test("calibration: 8 adım (4 uzak BSC + 4 yerel) tamamlanır, saha durur", async ({ request }) => {
    const token = await login(request);
    const res = await exec(request, token, "calibration", { powerKw: 100 });
    expect(res.status).toBe("completed");
    expect(res.outcomes).toHaveLength(8);
    expect(res.outcomes.every((o) => o.success)).toBe(true);
    expect(res.outcomes.filter((o) => o.system === "container-1")).toHaveLength(4);

    await expect
      .poll(
        async () => {
          const kw = num((await pcs(request, token))["Grid Active Power"]);
          if (kw === undefined) return "veri yok";
          return Math.abs(kw) < 5 ? "ok" : `kw=${kw}`;
        },
        { timeout: 30_000, intervals: [2000] },
      )
      .toBe("ok");
  });

  test("I-1 toprak interlock: earthed → charge reddedilir; açıkken çalışır", async ({
    request,
  }) => {
    const token = await login(request);
    const wait = (pred: () => Promise<string>) =>
      expect.poll(pred, { timeout: 30_000, intervals: [1500] });

    // Temiz başlangıç: standby + topraklar açık.
    await exec(request, token, "standby");
    await cmd(request, token, "H05_earth_open");
    await cmd(request, token, "H04_earth_open");
    await wait(async () => {
      const m = await mv(request, token);
      return Number(m["H05 Earth"]) === 0 && Number(m["H04 Earth"]) === 0 ? "open" : "wait";
    }).toBe("open");

    // Simülatör interlock'u: toprak ancak kesici AÇIKken kapanır.
    const open = await cmd(request, token, "H05_open");
    expect(open.status, JSON.stringify(open.body)).toBe(200);
    await wait(async () => (Number((await mv(request, token))["H05 Breaker"]) === 0 ? "open" : "wait")).toBe("open");

    const close = await cmd(request, token, "H05_earth_close");
    expect(close.status, JSON.stringify(close.body)).toBe(200);
    await wait(async () => (Number((await mv(request, token))["H05 Earth"]) === 1 ? "earthed" : "wait")).toBe("earthed");

    // Earthed → charge reddedilmeli (interlock_earthed, HTTP 503).
    const rejected = await postRaw(request, token, "/api/operations/charge/execute", {
      params: { powerKw: 100 },
    });
    expect(rejected.status, JSON.stringify(rejected.body)).toBe(503);
    expect((rejected.body as { reason?: string }).reason).toBe("interlock_earthed");

    // Toprağı aç + kesiciyi kapat → charge yürür.
    await cmd(request, token, "H05_earth_open");
    await wait(async () => (Number((await mv(request, token))["H05 Earth"]) === 0 ? "open" : "wait")).toBe("open");
    await cmd(request, token, "H05_close");
    await wait(async () => (Number((await mv(request, token))["H05 Breaker"]) === 1 ? "closed" : "wait")).toBe("closed");

    const ok = await exec(request, token, "charge", { powerKw: 100 });
    expect(ok.status).toBe("completed");

    // Temizlik: durdur + toprak aç / kesici kapalı.
    await exec(request, token, "standby");
    await cmd(request, token, "H05_earth_open");
  });

  test("temizlik: sahayı FL-01 start + standby ile hazır bırakır", async ({ request }) => {
    const token = await login(request);
    const startup = await execManeuver(request, token, "fl01_startup", {});
    expect(startup.status).toBe("completed");
    const standby = await execManeuver(request, token, "fl04_calibration", {});
    expect(standby.status).toBe("completed");
    await expect
      .poll(
        async () => {
          const kw = num((await pcs(request, token))["Grid Active Power"]);
          const cd = num((await bsc(request, token))["Charge/Discharge Status"]);
          if (kw === undefined || cd === undefined) return "veri yok";
          return Math.abs(kw) < 5 && cd !== CD_CHARGE && cd !== CD_DISCHARGE ? "ok" : `kw=${kw} cd=${cd}`;
        },
        { timeout: 30_000, intervals: [2000] },
      )
      .toBe("ok");
  });
});
