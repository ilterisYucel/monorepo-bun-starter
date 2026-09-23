import { test, expect, type Page } from "@playwright/test";

/**
 * AUTH-REFRESH 2026-09-23 — field auth E2E (UC-5):
 * - AK-5.2: logout → login ekranı (auto-guest YOK).
 * - Kısa TTL testi (A1): access süresi dolunca OTomatik refresh — dashboard
 *   kesintisiz; refresh BAŞARISIZSA login ekranı (guest YOK).
 * - AK-5.1: çift sekme — B login → A refresh → İKİ sekme de login'e düşer
 *   (K2+K5 dokümante fail-closed davranışı).
 *
 * Ön koşul: field dev stack'i (FIELD_UI_URL).
 * Zamanlama testleri için stack KISA access TTL ile kalkmalı (A1):
 *   ACCESS_TOKEN_EXPIRY_SECONDS=10 (web-service env — field.dev compose).
 *   Bu env yoksa ilgili testler E2E_SHORT_TTL=1 işaretiyle skip edilir.
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:5174";
const FIELD_ID = process.env.FIELD_ID || "5d5e49dc-7757-4f3e-a026-0263c2966bc6";
const SHORT_TTL = process.env.E2E_SHORT_TTL === "1";
const TTL_SECONDS = Number(process.env.E2E_ACCESS_TOKEN_TTL_SECONDS || 10);

async function loginField(page: Page, username = "admin"): Promise<void> {
  await page.goto(`${FIELD_UI}/login`);
  await page.getByPlaceholder("Kullanıcı adı").fill(username);
  await page.getByPlaceholder("Şifre").fill(
    process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456",
  );
  await page.getByRole("button", { name: /Giriş|Login/i }).click();
  await page.waitForURL(new RegExp(`/field/${FIELD_ID}`), { timeout: 20000 });
}

async function assertOnLogin(page: Page): Promise<void> {
  await page.waitForURL(/\/login/, { timeout: 30000 });
  await expect(page.getByPlaceholder("Kullanıcı adı")).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Field auth (AUTH-REFRESH — UC-5)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("AK-5.2: logout → login ekranı (auto-guest YOK)", async ({ page }) => {
    await loginField(page);
    await page.getByTitle("Çıkış").click();
    await assertOnLogin(page);
    // localStorage token'ları temizlenmiştir
    const tokens = await page.evaluate(() => ({
      at: localStorage.getItem("auth-token"),
      rt: localStorage.getItem("auth-refresh-token"),
    }));
    expect(tokens.at).toBeNull();
    expect(tokens.rt).toBeNull();
  });

  test("kısa TTL: access süresi dolar → otomatik refresh → dashboard kesintisiz", async ({
    page,
  }) => {
    test.skip(!SHORT_TTL, "A1: kısa access TTL stack'i gerekli (E2E_SHORT_TTL=1)");
    await loginField(page);

    // 2 TTL penceresi bekle — birden çok 401-refresh döngüsü yaşanır;
    // login'e düşülmemelidir (tek-uçuş refresh + rotasyon).
    await page.waitForTimeout((TTL_SECONDS + 5) * 1000 * 2);
    await page.reload();
    await page.waitForURL(new RegExp(`/field/${FIELD_ID}`), { timeout: 20000 });
    expect(page.url()).toContain(`/field/${FIELD_ID}`);
  });

  test("kısa TTL: refresh başarısız (token iptal) → login ekranı", async ({
    page,
  }) => {
    test.skip(!SHORT_TTL, "A1: kısa access TTL stack'i gerekli (E2E_SHORT_TTL=1)");
    await loginField(page);
    // Sunucudaki refresh token iptal edilir (logout = global iptal, K3) —
    // ancak yerel token'lar kalır → ilk expiry'de refresh 401 → login.
    await page.evaluate(async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("auth-token")}` },
      }).catch(() => undefined);
    });

    await assertOnLogin(page);
    const at = await page.evaluate(() => localStorage.getItem("auth-token"));
    expect(at).toBeNull();
  });

  test("AK-5.1: çift sekme — B login, A refresh → iki sekme de login'e düşer", async ({
    context,
  }) => {
    test.skip(!SHORT_TTL, "A1: kısa access TTL stack'i gerekli (E2E_SHORT_TTL=1)");
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await loginField(pageA);
    // Sekme B aynı kullanıcıyla giriş yapar → DB'deki refresh token değişir (K2).
    await loginField(pageB);

    // Sekme A'nın access token'ı dolar → eski refresh token'la refresh →
    // K5 reuse tespiti → saklı token iptal → A login'e düşer.
    await assertOnLogin(pageA);

    // Sekme B'nin refresh token'ı da iptal edildi → expiry'de B de düşer.
    await assertOnLogin(pageB);
  });
});
