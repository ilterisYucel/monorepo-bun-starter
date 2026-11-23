import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";
import {
  CONTAINER_URL,
  FIELD_URL,
  ensurePcsReady,
  ensureStackReady,
  login,
} from "../../integration/web-service/helpers";

/** Field Sim-Lab uyumluluk ucu — arıza enjeksiyonu/temizliği. */
export const INJECT = process.env.DEMO_FIELD_INJECT_URL || "http://localhost:8090/compat/field";

/**
 * Site e2e paylaşılan yardımcıları (test DEĞİL).
 *
 * Ön koşul kurulumu **integrasyon katmanıyla aynı kaynaktan** gelir:
 * `ensureStackReady` (BSC Normal + PCS güç 0, koşul poll'ü). Böylece e2e
 * sıra bağımlılığı taşımaz — her akış kendi ucuz hazırlığını kurar.
 */

export const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:8088";
const ADMIN = process.env.E2E_ADMIN_USER || "admin";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "password1234";

/**
 * Aktif stack'in FIELD_ID'si.
 *
 * Sıra: `FIELD_ID` env → test stack (`deployment/test-stack/site/.env`) →
 * dev stack (`deployment/v2/dev/site/.env`). Aynı anda yalnız biri ayakta.
 */
export function fieldId(): string {
  if (process.env.FIELD_ID) return process.env.FIELD_ID;
  for (const candidate of [
    "deployment/test-stack/site/.env",
    "deployment/v2/dev/site/.env",
  ]) {
    try {
      const env = readFileSync(resolve(process.cwd(), candidate), "utf-8");
      const line = env.split("\n").find((l) => l.startsWith("FIELD_ID="));
      const id = line?.slice("FIELD_ID=".length).trim();
      if (id) return id;
    } catch {
      // sonraki aday
    }
  }
  return "";
}

/** Site API'sinden (8088 proxy) bearer token döner. */
export async function uiToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${FIELD_UI}/api/auth/login`, {
    data: { username: ADMIN, password: PASSWORD },
  });
  expect(res.ok(), `login (${res.status()})`).toBeTruthy();
  return ((await res.json()) as { accessToken: string }).accessToken;
}

/** Sahayı akışa hazırlar: BSC Normal + PCS güç 0 + PCS komut almaya hazır. */
export async function prepareSite(): Promise<void> {
  const [fieldToken, containerToken] = await Promise.all([login(FIELD_URL), login(CONTAINER_URL)]);
  await ensureStackReady(fieldToken, containerToken);
  // Önceki e2e'nin bıraktığı enjeksiyon/fault kilidini aç (idempotent).
  await Promise.all(
    ["PCS-1", "PCS-2"].map((deviceId) =>
      fetch(`${INJECT}/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, scenario: "nominal" }),
      }).catch(() => undefined),
    ),
  );
  await ensurePcsReady(fieldToken);
}

/** UI login akışı (login + portföy sayfası). */
export async function loginUi(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${FIELD_UI}/login`);
  await page.getByTestId("login-username").fill(ADMIN);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("demo-logo")).toBeVisible({ timeout: 20_000 });
}
