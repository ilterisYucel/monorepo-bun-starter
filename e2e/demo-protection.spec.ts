import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * demo-field KORUMA ZİNCİRİ e2e (v2/dev stack) — `DENETIM-ESLEME-v2.md`.
 *
 * Amaç: simülatör arızası enjekte edilir → konteyner kural motoru (43 kural)
 * → komut → FİZİKSEL etki (DC şalter açılır / oda ışığı yanar) zinciri uçtan
 * uca doğrulanır. Playwright APIRequestContext kullanır (tarayıcı UI seçicisi
 * yerine kararlı uçlar).
 *
 * Ön koşul: `bun run start:demo-integration`.
 * Env: FIELD_UI_URL (5002 API / 8088 UI), CONTAINER_INJECT_URL (15590).
 */

const FIELD_API = process.env.FIELD_API_URL || "http://localhost:5002";
const INJECT_URL = process.env.DEMO_CONTAINER_INJECT_URL || "http://localhost:15590";
const ADMIN = process.env.E2E_ADMIN_USER || "admin";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "password1234";

function resolveFieldId(): string {
  if (process.env.FIELD_ID) return process.env.FIELD_ID;
  try {
    const env = readFileSync(resolve(process.cwd(), "deployment/v2/dev/field/.env"), "utf-8");
    const line = env.split("\n").find((l) => l.startsWith("FIELD_ID="));
    return line ? line.slice("FIELD_ID=".length).trim() : "";
  } catch {
    return "";
  }
}

const FIELD_ID = resolveFieldId();

interface Row {
  deviceId?: string;
  name: string;
  value: unknown;
  tags?: Record<string, string>;
}

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${FIELD_API}/api/auth/login`, {
    data: { username: ADMIN, password: PASSWORD },
  });
  expect(res.ok(), `login başarısız (${res.status()})`).toBeTruthy();
  const body = (await res.json()) as { accessToken?: string };
  expect(body.accessToken).toBeTruthy();
  return body.accessToken!;
}

async function containerRows(request: APIRequestContext, token: string): Promise<Row[]> {
  const res = await request.get(`${FIELD_API}/api/fields/${FIELD_ID}/containers`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as unknown;
  const containers = (Array.isArray(body) ? body : (body as { containers?: unknown[] }).containers) ?? [];
  return (containers as Array<{ latestTelemetry?: Row[] }>).flatMap((c) => c.latestTelemetry ?? []);
}

async function inject(request: APIRequestContext, deviceId: string, scenario: string): Promise<void> {
  const res = await request.post(`${INJECT_URL}/inject`, { data: { deviceId, scenario } });
  expect(res.ok(), `enjeksiyon başarısız: ${deviceId}/${scenario} (${res.status()})`).toBeTruthy();
}

async function waitFor(
  request: APIRequestContext,
  token: string,
  deviceId: string,
  name: string,
  expected: number,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await containerRows(request, token);
    const row = rows.find((r) => r.deviceId === deviceId && r.name === name);
    if (row && Number(row.value) === expected) return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

test.describe.configure({ mode: "serial", timeout: 90_000 });

/** Test sonrası durum temizliği: kapı/IMD + BSC emergency kilidini çöz. */
test.afterEach(async ({ request }) => {
  await inject(request, "CONTROL-PANEL-IO-1", "battery_door_close").catch(() => undefined);
  await inject(request, "IMD-1", "healthy").catch(() => undefined);
  const token = await login(request).catch(() => "");
  if (token) {
    // standby = pcs_standby + bsc_stop; bsc_stop EMERGENCY'den çıkışı sağlar.
    await request
      .post(`${FIELD_API}/api/operations/standby/execute`, {
        headers: { authorization: `Bearer ${token}` },
        data: {},
      })
      .catch(() => undefined);
  }
});

test("FL-07: kapı açık → oda ışığı yanar (kural → komut → fiziksel etki)", async ({ request }) => {
  test.skip(!FIELD_ID, "FIELD_ID yok");
  const token = await login(request);
  await inject(request, "CONTROL-PANEL-IO-1", "battery_door_close");
  await new Promise((r) => setTimeout(r, 6000));
  await inject(request, "CONTROL-PANEL-IO-1", "battery_door_open");
  const ok = await waitFor(request, token, "CONTROL-PANEL-IO-1", "Battery Room Light", 1, 30000);
  expect(ok, "oda ışığı yanmadı (kural tetiklenmedi)").toBeTruthy();
  await inject(request, "CONTROL-PANEL-IO-1", "battery_door_close");
});

test("FL-11: izolasyon arızası → DC şalter açılır (kural → komut → fiziksel etki)", async ({ request }) => {
  test.skip(!FIELD_ID, "FIELD_ID yok");
  const token = await login(request);
  await inject(request, "IMD-1", "healthy");
  await new Promise((r) => setTimeout(r, 6000));
  await inject(request, "IMD-1", "fault");
  const ok = await waitFor(request, token, "CB-1", "Is Open", 1, 30000);
  expect(ok, "CB-1 açılmadı (FL-11 tetiklenmedi)").toBeTruthy();
  await inject(request, "IMD-1", "healthy");
});
