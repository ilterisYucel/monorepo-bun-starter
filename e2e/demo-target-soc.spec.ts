import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * demo-field HEDEF SOC (frontend) e2e — SPEC UC-5.
 *
 * Backend hedef SOC'yi desteklemez; hedef ön yüzde saklanır ve
 * `useTargetSocWatcher` SOC hedefe ulaşınca **standby** çalıştırır. Bu spec
 * zincirin tamamını gerçek tarayıcıda doğrular:
 *   UI formu (charge + hedef SOC) → hedef kaydı (durum satırı) → watcher tetiği
 *   → yeni `standby` run'ı + PCS gücü ≈ 0 → durum satırının kaybolması.
 *
 * NOT: SOC'nin gerçek hızda hedefe inmesi dakikalar sürer; deterministik ve
 * hızlı doğrulama için **anında tetiklenen** hedef seçilir (charge + hedef =
 * mevcut SOC − 1 → `soc ≥ target` zaten doğru).
 *
 * Ön koşul: demo-integration stack; E2E_ADMIN_PASSWORD + FIELD_ID zorunlu.
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:8088";
const FIELD_ID = process.env.FIELD_ID || "";
const ADMIN = process.env.E2E_ADMIN_USER || "admin";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";

test.describe.configure({ mode: "serial" });

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${FIELD_UI}/api/auth/login`, {
    data: { username: ADMIN, password: PASSWORD },
  });
  expect(res.ok(), `login başarısız (${res.status()})`).toBe(true);
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

async function avgSoc(request: APIRequestContext, token: string): Promise<number> {
  const res = await request.get(`${FIELD_UI}/api/fields/${FIELD_ID}/containers`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as unknown;
  const list = (Array.isArray(body) ? body : (body as { containers?: unknown[] }).containers) ?? [];
  const rows: Row[] = (list as Array<{ latestTelemetry?: Row[] }>).flatMap((c) => c.latestTelemetry ?? []);
  const socs = rows
    .filter((r) => r.tags?.canonical === "soc" && typeof r.value === "number")
    .map((r) => r.value as number);
  expect(socs.length, "SOC telemetrisi yok").toBeGreaterThan(0);
  return socs.reduce((a, b) => a + b, 0) / socs.length;
}

async function pcsPowerKw(request: APIRequestContext, token: string): Promise<number> {
  const res = await request.get(`${FIELD_UI}/api/data/PCS-1/latest?limit=500`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as unknown;
  const rows: Row[] = Array.isArray(body)
    ? (body as Row[])
    : ((body as { data?: Row[] }).data ?? []);
  const p = rows.filter((r) => r.name === "Grid Active Power").at(-1);
  return typeof p?.value === "number" ? (p.value as number) : 0;
}

async function uiLogin(page: Page): Promise<void> {
  // Standalone demo erişimi KÖK URL'dir: `/fields/<fid>/ui/` yolunda SPA tünel
  // moduna geçer ve `apiBaseUrl` `/fields/<fid>/ui/api` olur; tek-başına
  // field-web nginx bunu proxy'lemez → login kırılır. Kök `/` normal moddur.
  await page.goto(`${FIELD_UI}/`);
  await page.getByTestId("login-username").fill(ADMIN);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByRole("tab", { name: "Operations" })).toBeVisible({ timeout: 15000 });
}

test("FL-02 hedef SOC: frontend watcher SOC hedefe ulaşınca standby çalıştırır", async ({ request, page }) => {
  const token = await login(request);
  const soc = await avgSoc(request, token);
  const target = Math.max(0, Math.floor(soc) - 1);
  const t0 = Date.now();

  await uiLogin(page);
  await page.getByRole("tab", { name: "Operations" }).click();

  // FL-02 (varsayılan) formu: Charge + güç + hedef SOC
  await page.getByTestId("ops-dir-chg").click();
  await page.getByTestId("ops-power").fill("200");
  await page.getByTestId("ops-target").fill(String(target));
  await page.getByTestId("ops-send").click();
  await page.getByTestId("ops-confirm").click();

  // Hedef kaydedildi → durum satırı görünür
  await expect(page.getByTestId("ops-target-status")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("ops-target-status")).toContainText(`Target ${target} %`);

  // Watcher: önce charge run'ı başlar, sonra hedefe ulaşınca standby gelir
  await expect
    .poll(
      async () => {
        const res = await request.get(`${FIELD_UI}/api/operations/runs`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok()) return "http-error";
        const body = (await res.json()) as unknown;
        const list = (Array.isArray(body) ? body : ((body as { runs?: unknown[] }).runs ?? [])) as Array<{
          name: string;
          startedAt: string;
        }>;
        const hit = list.find((r) => r.name === "standby" && Date.parse(r.startedAt) >= t0 - 1000);
        return hit ? "standby" : "pending";
      },
      { timeout: 45000, intervals: [2000] },
    )
    .toBe("standby");

  // PCS gücü sıfıra döner
  await expect
    .poll(async () => Math.abs(await pcsPowerKw(request, token)), {
      timeout: 30000,
      intervals: [2000],
    })
    .toBeLessThan(5);

  // Watcher hedefi temizledi → durum satırı kaybolur
  await expect(page.getByTestId("ops-target-status")).toBeHidden({ timeout: 15000 });
});
