import { test, expect, type Page } from "@playwright/test";

const step = (name: string) => console.log("[E2E]", name);

/**
 * Otomasyon kuralları E2E (KONTEYNER-MANEVRA-KATALOGU-REV03 Faz 3, K9):
 *
 * Konteyner stack'inde management-service rules.json'u yükler. HVAC
 * simülatörleri `Current Temp` 25.0°C ile BAŞLAR (remoteOn=false — değer
 * sabit kalır) → `tms_cool_on_h1..h8` (≥25) ilk değerlendirme döngüsünde
 * (10 sn) ATEŞLER → 8 HVAC'a `force_cool` komut zinciri (Remote On/Off ← 1
 * + Cooling Setpoint ← 10).
 *
 * Gözlemlenebilir kanıt (management-service TamperLogger sink'i console'dur —
 * /api/logs'a yazmaz; aksiyonun FİZİKSEL etkisi telemetriden doğrulanır):
 * - `GET /api/data/HVAC-1/latest` → Equipment Status = 2 (çalışıyor) ve
 *   Current Temp < 23°C (soğuma) — hiçbir başka mekanizma HVAC'ı
 *   uzaktan açmaz (UI'da otomatik tetik yok); end-state yalnızca kural
 *   zinciriyle üretilebilir.
 * - HVAC-2 ikinci tanık olarak doğrulanır (h2 kuralı).
 *
 * FL başına ayrı UI e2e YOKTUR (K9) — senaryo matrisi management-service
 * `automation-rules.spec.ts` integration spec'indedir.
 *
 * Ön koşul: container dev stack, konteyner UI 5173.
 */

const WEB_UI = process.env.WEB_UI_URL || "http://localhost:5173";

interface LatestResponse {
  telemetries?: Array<{ name: string; value: unknown }>;
}

async function loginContainer(page: Page): Promise<void> {
  await page.goto(`${WEB_UI}/#/login`);
  await page.getByPlaceholder("admin", { exact: true }).fill("admin");
  await page
    .getByPlaceholder("admin123", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456");
  await page.getByRole("button", { name: /Giriş|Login/i }).click();
  await page.waitForURL(/#\//, { timeout: 15000 });
}

async function latestOf(page: Page, deviceId: string): Promise<Record<string, unknown>> {
  return page.evaluate(async (id) => {
    const token = localStorage.getItem("auth-token");
    const res = await fetch(`/api/data/${id}/latest?limit=100`, {
      headers: { authorization: `Bearer ${token ?? ""}` },
    });
    if (!res.ok) return {};
    const body = (await res.json()) as LatestResponse;
    return Object.fromEntries(
      (body.telemetries ?? []).map((t) => [t.name, t.value]),
    );
  }, deviceId);
}

const asNumber = (v: unknown): number | undefined =>
  typeof v === "number" ? v : undefined;

test.describe("Otomasyon kuralları (konteyner tier)", () => {
  test.describe.configure({ timeout: 240_000 });

  test("tms_cool_on_h1..h8 → HVAC'lar soğutma moduna geçer (kural → komut → fiziksel etki)", async ({
    page,
  }) => {
    await loginContainer(page);
    step("1-login-ok");

    // HVAC-1: kural zinciri → Equipment Status 2 (çalışıyor) + soğuma.
    await expect
      .poll(async () => latestOf(page, "HVAC-1"), {
        timeout: 120_000,
        message: "HVAC-1 kural zinciriyle çalışıp soğumalı",
      })
      .toMatchObject({
        "Equipment Status": 2,
      });
    step("2-hvac1-running");

    const hvac1 = await latestOf(page, "HVAC-1");
    const temp1 = asNumber(hvac1["Current Temp"]);
    expect(temp1).toBeDefined();
    expect(temp1!).toBeLessThan(23);
    step("3-hvac1-cooling");

    // HVAC-2 ikinci tanık (h2 kuralı aynı zincirden).
    await expect
      .poll(async () => latestOf(page, "HVAC-2"), {
        timeout: 60_000,
        message: "HVAC-2 de kural zinciriyle çalışmalı",
      })
      .toMatchObject({
        "Equipment Status": 2,
      });
    step("4-hvac2-running");
  });
});
