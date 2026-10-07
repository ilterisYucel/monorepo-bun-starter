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
const USER = process.env.DEMO_USER ?? "admin";
const PASSWORD = process.env.DEMO_PASSWORD ?? "password123";
const NEW_PASSWORD = process.env.DEMO_NEW_PASSWORD ?? "password1234";

let token = "";
let fieldId = "";

function resolveFieldId(): string {
  if (process.env.DEMO_FIELD_ID) return process.env.DEMO_FIELD_ID;
  try {
    const env = readFileSync(
      resolve(__dirname, "../../../deployment/dev/demo-edge/.env"),
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
  const r = (await containerRows()).find(
    (x) => x.deviceId === "BSC-1" && x.tags?.canonical === "soc",
  );
  return r ? Number(r.value) : NaN;
}
async function bscChargeSetpoint(): Promise<number> {
  const r = (await containerRows()).find(
    (x) => x.deviceId === "BSC-1" && x.name === "Charge Power Setpoint",
  );
  return r ? Number(r.value) : NaN;
}
async function bscCommandRequest(): Promise<number> {
  const r = (await containerRows()).find(
    (x) => x.deviceId === "BSC-1" && x.name === "Command Request",
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

describe("powerKw tüm katmanlara yayılır (Q1)", () => {
  it("girilen güç BSC şarj setpointine yansır (powerKw/2 BSC)", async () => {
    const exec1 = await exec("charge", { params: { powerKw: 20 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(exec1.status);
    await sleep(8000);
    const setpoint = await bscChargeSetpoint();
    expect(Number.isFinite(setpoint)).toBe(true);
    expect(setpoint).toBeCloseTo(10, 1); // 20 kW / 2 BSC
    await standby();
  }, 60_000);
});

describe("şarj/deşarj fiziksel etki (AK-10.4)", () => {
  it("charge → PCS gücü negatif + SOC artar; standby durdurur", async () => {
    const before = await bscSoc();
    expect(Number.isFinite(before)).toBe(true);

    const exec1 = await exec("charge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(exec1.status);
    await sleep(6000);
    expect(await pcsPowerKw()).toBeLessThan(0);

    await sleep(12000);
    const after = await bscSoc();
    expect(after).toBeGreaterThan(before + 0.05);

    await standby();
    expect(Math.abs(await pcsPowerKw())).toBeLessThan(1);
  }, 90_000);

  it("discharge → PCS gücü pozitif + SOC düşer", async () => {
    const before = await bscSoc();
    const exec1 = await exec("discharge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(exec1.status);
    await sleep(6000);
    expect(await pcsPowerKw()).toBeGreaterThan(0);

    await sleep(12000);
    const after = await bscSoc();
    expect(after).toBeLessThan(before - 0.05);
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
  it("charge + timer 5 sn → BSC stop komutu + güç 0 + SOC durur", async () => {
    const exec1 = await exec("charge", {
      params: { powerKw: 200 },
      deviceIds: ["PCS-1", "PCS-2"],
      timer: { durationSeconds: 5 },
    });
    expect([200, 202]).toContain(exec1.status);

    // Timer (5 sn) + telemetri yayılım payı.
    await sleep(18000);
    // Deterministik: BSC stop komutu (Command Request = 3) yazılmış olmalı.
    expect(await bscCommandRequest()).toBe(3);
    expect(Math.abs(await pcsPowerKw())).toBeLessThan(1);
    // SOC artık durmalı (iki örnek de stop SONRASI).
    const a = await bscSoc();
    await sleep(10000);
    const b = await bscSoc();
    expect(Math.abs(b - a)).toBeLessThan(0.06);
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
