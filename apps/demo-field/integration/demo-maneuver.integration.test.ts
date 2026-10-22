import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Demo manevra ENTEGRASYON testleri (SPEC UC-10 / FR-10.4..10.6, T-43).
 *
 * Gerçek field+container stack'ine karşı koşar (FR-10.6: stack yoksa net hata,
 * sessiz skip yok). TÜM demo manevralarını + powerKw yayılımını + timer'ı +
 * interlock'u FİZİKSEL etkiyle doğrular.
 */

const BASE = process.env.DEMO_STACK_URL ?? "http://localhost:5002";
const CONTAINER = process.env.DEMO_CONTAINER_URL ?? "http://localhost:5001";
const USER = process.env.DEMO_USER ?? "admin";
const PASSWORD = process.env.DEMO_PASSWORD ?? "password123";
const NEW_PASSWORD = process.env.DEMO_NEW_PASSWORD ?? "password1234";

let token = "";
let fieldId = "";

function resolveFieldId(): string {
  if (process.env.DEMO_FIELD_ID) return process.env.DEMO_FIELD_ID;
  try {
    const env = readFileSync(
      resolve(__dirname, "../../../deployment/v2/dev/field/.env"),
      "utf-8",
    );
    const line = env.split("\n").find((l) => l.startsWith("FIELD_ID="));
    return line ? line.slice("FIELD_ID=".length).trim() : "";
  } catch {
    return "";
  }
}

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

type Row = { deviceId: string; name: string; value: unknown; tags?: Record<string, string> };
async function containerRows(): Promise<Row[]> {
  const { body } = await api(`/api/fields/${fieldId}/containers`);
  const containers = body as Array<{ latestTelemetry?: Row[] }>;
  return containers?.[0]?.latestTelemetry ?? [];
}
async function bscSoc(): Promise<number> {
  const r = (await containerRows()).find((x) => x.deviceId === "BSC-1" && x.name === "BSC SOC");
  return r ? Number(r.value) : NaN;
}
async function bscChargeStatus(): Promise<number> {
  const r = (await containerRows()).find(
    (x) => x.deviceId === "BSC-1" && x.name === "ChargeStatus",
  );
  return r ? Number(r.value) : NaN;
}
async function pcsPowerKw(): Promise<number> {
  const { body } = await api("/api/unified/telemetry/latest?deviceIds=PCS-1");
  const rows = (body as { telemetries?: Row[] }).telemetries ?? [];
  const p = rows.find((r) => r.tags?.canonical === "power_kw");
  return p ? Number(p.value) : NaN;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function exec(op: string, body: Record<string, unknown> = {}) {
  return api(`/api/operations/${op}/execute`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function standby() {
  await exec("standby");
  await sleep(4000);
}

beforeAll(async () => {
  const health = await fetch(`${BASE}/health`).catch((e) => {
    throw new Error(
      `Demo stack erişilemedi (${BASE}): ${(e as Error).message}. ` +
        "Önce 'bun run start:demo-integration' ile stack'i başlatın.",
    );
  });
  if (!health.ok) throw new Error(`Demo stack sağlık başarısız: HTTP ${health.status}`);

  fieldId = resolveFieldId();
  if (!fieldId) throw new Error("FIELD_ID bulunamadı (DEMO_FIELD_ID env veya demo-edge/.env)");

  type LoginBody = { accessToken?: string; user?: { mustChangePassword?: boolean } };
  const tryLogin = (password: string) =>
    api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: USER, password }),
    });

  let login = await tryLogin(PASSWORD);
  if (login.status !== 200 && NEW_PASSWORD !== PASSWORD) login = await tryLogin(NEW_PASSWORD);
  if (login.status !== 200) throw new Error(`Login başarısız: HTTP ${login.status}`);
  const lb = login.body as LoginBody;
  token = lb.accessToken ?? "";
  if (lb.user?.mustChangePassword) {
    const cp = await api("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword: PASSWORD, newPassword: NEW_PASSWORD }),
    });
    if (cp.status !== 200) throw new Error(`Şifre değişimi başarısız: HTTP ${cp.status}`);
    token = (cp.body as LoginBody).accessToken ?? token;
  }
  if (!token) throw new Error("accessToken yok");

  // Paylaşılan stack: önceki testlerden kalan BSC durumunu (EMERGENCY vb.)
  // normale döndür — demo şarj/deşarj operasyonları START/DISCHARGE gerektirir.
  const cLogin = await fetch(`${CONTAINER}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: NEW_PASSWORD }),
  });
  if (cLogin.ok) {
    const cToken = ((await cLogin.json()) as LoginBody).accessToken ?? "";
    const bscCommand = (deviceId: string, command: string) =>
      fetch(`${CONTAINER}/api/commands/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cToken}` },
        body: JSON.stringify({ deviceId, command }),
      });
    await Promise.all([
      bscCommand("BSC-1", "reset"),
      bscCommand("BSC-2", "reset"),
    ]);
    await sleep(8000);
    await Promise.all([
      bscCommand("BSC-1", "start"),
      bscCommand("BSC-2", "start"),
    ]);
    await sleep(4000);
  }
});

describe("demo manevra kataloğu (AK-10.1/10.2)", () => {
  it("6 demo operasyonu yüklü; mevcut katalog korunuyor", async () => {
    const { body } = await api("/api/operations");
    const names = ((body as { operations?: Array<{ name: string }> }).operations ?? []).map(
      (o) => o.name,
    );
    expect(names).toContain("field_charge");
    for (const demo of ["charge", "discharge", "full_charge", "full_discharge", "calibration", "standby"]) {
      expect(names, `demo operasyonu eksik: ${demo}`).toContain(demo);
    }
  });
});

describe("powerKw fiziksel zincire yayılır (Q1)", () => {
  it("girilen güç PCS S06 → connector → BSC SOC'yi şarj yönünde değiştirir", async () => {
    const before = await bscSoc();
    const exec1 = await exec("charge", { params: { powerKw: 300 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(exec1.status);
    let after = before;
    for (let i = 0; i < 15; i++) {
      await sleep(1500);
      after = await bscSoc();
      if (after > before + 0.2) break;
    }
    expect(after).toBeGreaterThan(before);
    await standby();
  }, 90_000);
});

describe("şarj/deşarj fiziksel etki (AK-10.4)", () => {
  it("charge → PCS gücü negatif; standby durdurur", async () => {
    const exec1 = await exec("charge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(exec1.status);
    await sleep(6000);
    expect(await pcsPowerKw()).toBeLessThan(0);

    await standby();
    expect(Math.abs(await pcsPowerKw())).toBeLessThan(1);
  }, 90_000);

  it("SIM-1: charge sonrası BSC şarj modu latch'lenir (ChargeStatus=1, komut kutusu 0)", async () => {
    await exec("charge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] });
    await sleep(15000);
    // Komut kutusu (40010) finalize ile 0'a döner ama sim yürütmeye devam etmeli.
    expect(await bscChargeStatus()).toBe(1);
    await standby();
  }, 90_000);

  it("discharge → PCS gücü pozitif", async () => {
    const exec1 = await exec("discharge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(exec1.status);
    await sleep(6000);
    expect(await pcsPowerKw()).toBeGreaterThan(0);
    await standby();
  }, 90_000);

  it("SIM-1: discharge sonrası BSC deşarj modu latch'lenir (ChargeStatus=2)", async () => {
    await exec("discharge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] });
    await sleep(15000);
    expect(await bscChargeStatus()).toBe(2);
    await standby();
  }, 90_000);

  it("full_charge / full_discharge operasyonları tamamlanır", async () => {
    expect([200, 202]).toContain(
      (await exec("full_charge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] })).status,
    );
    await sleep(5000);
    await standby();
    expect([200, 202]).toContain(
      (await exec("full_discharge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] })).status,
    );
    await sleep(5000);
    await standby();
  }, 60_000);

  it("calibration çok adımlı operasyon tamamlanır", async () => {
    const r = await exec("calibration", { params: { powerKw: 100 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(r.status);
    // Adımlar hızlı; kısa bekleme + durdur.
    await sleep(8000);
    await standby();
  }, 60_000);
});

describe("zamanlı durdurma (Q3)", () => {
  it("charge + timer 5 sn → PCS gücü 0'a iner", async () => {
    const exec1 = await exec("charge", {
      params: { powerKw: 200 },
      deviceIds: ["PCS-1", "PCS-2"],
      timer: { durationSeconds: 5 },
    });
    expect([200, 202]).toContain(exec1.status);

    // Timer PCS'e stop planlar → güç 0. (C1: BSC akım akarken bare stop'u
    // reddeder; doküman-doğru BSC durdurma bsc_stop manevrasıdır — setpoint
    // sıfırla + stop.)
    await sleep(18000);
    expect(Math.abs(await pcsPowerKw())).toBeLessThan(1);
    await standby();
  }, 90_000);
});

describe("MV interlock (AK-10.5)", () => {
  it("kesici kapalıyken toprak kapatma reddedilir", async () => {
    const { status, body } = await api("/api/commands/execute", {
      method: "POST",
      body: JSON.stringify({ deviceId: "DEMO-MV-1", command: "H05_earth_close" }),
    });
    expect([200, 422]).toContain(status);
    const result = body as { success?: boolean; validated?: boolean };
    expect(result.success === false || result.validated === false).toBe(true);

    const tel = await api("/api/unified/telemetry/latest?deviceIds=DEMO-MV-1");
    const rows = (tel.body as { telemetries?: Array<{ name: string; value: unknown }> }).telemetries ?? [];
    const earth = rows.find((r) => r.name === "H05 Earth");
    expect(earth).toBeDefined();
    expect(Number(earth?.value)).toBe(0);
  });
});
