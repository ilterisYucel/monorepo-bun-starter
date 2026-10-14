import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * demo-field CİHAZ VERİSİ e2e (v2/dev stack) — `DENETIM-ESLEME-v2.md`.
 *
 * Amaç: demo-field SPA canlı cihaz verisini gösterir; BSC (konteyner) ve PCS
 * (saha) telemetrisi gerçekten AKAR. Ön koşul: `bun run start:demo-integration`.
 *
 * Env: FIELD_UI_URL (default http://localhost:8088), FIELD_ID (yoksa
 * deployment/v2/dev/field/.env), E2E_ADMIN_USER, E2E_ADMIN_PASSWORD.
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:8088";
const ADMIN = process.env.E2E_ADMIN_USER || "admin";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "password1234";

function resolveFieldId(): string {
  if (process.env.FIELD_ID) return process.env.FIELD_ID;
  try {
    const env = readFileSync(
      resolve(process.cwd(), "deployment/v2/dev/field/.env"),
      "utf-8",
    );
    const line = env.split("\n").find((l) => l.startsWith("FIELD_ID="));
    return line ? line.slice("FIELD_ID=".length).trim() : "";
  } catch {
    return "";
  }
}

const FIELD_ID = resolveFieldId();

async function login(request: APIRequestContext): Promise<string> {
  let res = await request.post(`${FIELD_UI}/api/auth/login`, {
    data: { username: ADMIN, password: PASSWORD },
  });
  if (!res.ok()) {
    res = await request.post(`${FIELD_UI}/api/auth/login`, {
      data: { username: ADMIN, password: "password123" },
    });
  }
  expect(res.ok(), `login başarısız (${res.status()})`).toBeTruthy();
  const body = (await res.json()) as { accessToken?: string };
  expect(body.accessToken, "accessToken yok").toBeTruthy();
  return body.accessToken!;
}

interface Row {
  deviceId?: string;
  name: string;
  value: unknown;
  tags?: Record<string, string>;
}

test.describe.configure({ mode: "serial" });

test("demo-field SPA yüklenir ve giriş ekranı auth kapısı çalışır", async ({ page }) => {
  test.skip(!FIELD_ID, "FIELD_ID yok");
  await page.goto(`${FIELD_UI}/`);
  await expect(page.getByTestId("login-username")).toBeVisible();
  await expect(page.getByTestId("login-password")).toBeVisible();
  await expect(page.getByTestId("login-submit")).toBeVisible();
});

test("konteyner cihaz verisi (BSC) uçtan akar", async ({ request }) => {
  test.skip(!FIELD_ID, "FIELD_ID yok");
  const token = await login(request);
  const res = await request.get(`${FIELD_UI}/api/fields/${FIELD_ID}/containers`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as unknown;
  const containers = (Array.isArray(body) ? body : (body as { containers?: unknown[] }).containers) ?? [];
  const rows: Row[] = (containers as Array<{ latestTelemetry?: Row[] }>).flatMap(
    (c) => c.latestTelemetry ?? [],
  );
  const devices = new Set(rows.map((r) => r.deviceId));
  expect(devices.has("BSC-1"), "BSC-1 telemetrisi yok").toBeTruthy();
  const soc = rows.find((r) => r.deviceId === "BSC-1" && r.tags?.canonical === "soc");
  expect(soc, "BSC SOC kanonik telemetrisi yok").toBeTruthy();
  expect(Number(soc!.value)).toBeGreaterThanOrEqual(0);
});

test("saha cihaz verisi (PCS) uçtan akar", async ({ request }) => {
  const token = await login(request);
  const res = await request.get(
    `${FIELD_UI}/api/unified/telemetry/latest?deviceIds=PCS-1`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { telemetries?: Row[] };
  const rows = body.telemetries ?? [];
  expect(rows.length, "PCS-1 telemetrisi yok").toBeGreaterThan(50);
  const voltage = rows.find((r) => r.name === "Battery Pack Total Voltage");
  expect(Number(voltage?.value)).toBeGreaterThan(1000);
});

test("Devices ekranı cihaz ağacını render eder (auth sonrası)", async ({ page }) => {
  test.skip(!FIELD_ID, "FIELD_ID yok");
  await page.goto(`${FIELD_UI}/login`);
  await page.getByTestId("login-username").fill(ADMIN);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("demo-logo")).toBeVisible();
  // UC-11: login sonrası portföy sayfasına inilir; konsola geç.
  await page.goto(`${FIELD_UI}/field/${FIELD_ID}`);
  await page.getByRole("tab", { name: "Devices" }).click();
  await expect(page.getByTestId("demo-logo")).toBeVisible();
  // Cihaz ağacı ve birim sekmeleri render edilmeli.
  await expect(page.getByRole("navigation", { name: "Devices" })).toBeVisible();
  await expect(page.getByTestId("devtab-battery")).toBeVisible();
});
