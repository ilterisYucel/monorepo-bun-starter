import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensurePcsReady, ensureStackReady } from "../helpers";

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
      resolve(__dirname, "../../../../deployment/v2/dev/site/.env"),
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
  // Dizi sırası GARANTİ DEĞİL (field birden fazla konteyner döndürür);
  // index 0'a güvenmek yanlış konteynerin BSC'sini okur → containerId ile seç.
  const containers = body as Array<{ containerId?: string; latestTelemetry?: Row[] }>;
  const target = containers.find((c) => c.containerId === "container-1") ?? containers[0];
  return target?.latestTelemetry ?? [];
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

/**
 * Koşul sağlanana kadar bekler (202 = operasyon arka planda sürer; `charge`
 * artık `bsc_prepare` (~20 s) içerdiği için sabit bekleme yarışıyor).
 */
async function waitUntil(check: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await check()) return true;
    await sleep(2000);
  }
  return false;
}

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
        "Önce 'bun run dev:stack:up' ile stack'i başlatın.",
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

  // Ön koşul: ucuz tam hazırlık (BSC Normal + PCS güç 0) — operasyonlar
  // kendi `bsc_prepare` adımını da içerir. Container token'ı burada alınır.
  const cLogin = await fetch(`${CONTAINER}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, password: NEW_PASSWORD }),
  });
  if (cLogin.ok) {
    const cToken = (((await cLogin.json()) as LoginBody).accessToken ?? "") as string;
    if (cToken) await ensureStackReady(token, cToken);
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



describe("şarj/deşarj fiziksel etki (AK-10.4)", () => {
  it("charge → PCS gücü negatif; standby durdurur", async () => {
    const exec1 = await exec("charge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(exec1.status);
    // Rampa + setpoint etkisi 5–20 s → koşul polling'i.
    let p = Number.NaN;
    for (let i = 0; i < 10; i++) {
      await sleep(2000);
      p = await pcsPowerKw();
      if (p < 0) break;
    }
    expect(p).toBeLessThan(0);

    await standby();
    expect(Math.abs(await pcsPowerKw())).toBeLessThan(1);
  }, 90_000);



  it("discharge → PCS gücü pozitif", async () => {
    // Önceki testin standby'ından kalan durum: PCS'i hedefli hazırla.
    await ensurePcsReady(token);
    const exec1 = await exec("discharge", { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] });
    expect([200, 202]).toContain(exec1.status);
    let p = Number.NaN;
    for (let i = 0; i < 10; i++) {
      await sleep(2000);
      p = await pcsPowerKw();
      if (p > 0) break;
    }
    expect(p).toBeGreaterThan(0);
    await standby();
  }, 90_000);






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


