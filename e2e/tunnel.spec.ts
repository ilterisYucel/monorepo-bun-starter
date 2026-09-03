import { test, expect } from "@playwright/test";

/**
 * Faz 4 E2E — tünel iframe turu (K4.1/K4.2):
 * - K4.1: /containers/:cid/ui/#/dashboard iframe'de render (SPA + asset'ler).
 * - K4.2: login ekranı GÖRÜNMEZ — session hydrate (cookie) ile doğrudan
 *   dashboard açılır.
 * - Faz 3 kanıtı: /api + /ws tünelden çalışır (iframe içi).
 *
 * Ön koşul: field+container dev stack'leri + kurulum (saha/register) +
 * geçerli bir tünel oturumu. BASE_URL = field web-service (5002).
 */

const FIELD_BASE = process.env.FIELD_URL || "http://localhost:5002";
const FIELD_ID = process.env.FIELD_ID || "5d5e49dc-7757-4f3e-a026-0263c2966bc6";
const CONTAINER_ID = "container-1";

test.describe("tünel iframe (Faz 4 — K4.1/K4.2)", () => {
  test("cookie ile /#/dashboard render; login ekrani gorunmez", async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: FIELD_BASE });
    const page = await context.newPage();

    // 1) field'a admin girisi (JWT al) — oturum acmak icin
    // NOT: page.request 302'de set-cookie ayristirmasinda relative-URL quirk'i
    // tasir; kurulum adimlari node fetch ile yapilir.
    const login = await fetch(`${FIELD_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "kurulum-yeni-sifre-456" }),
    });
    expect(login.ok).toBe(true);
    const { accessToken } = await login.json();

    // 2) oturum ac → Set-Cookie yakala (302)
    const session = await fetch(
      `${FIELD_BASE}/api/fields/${FIELD_ID}/containers/${CONTAINER_ID}/session`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
        redirect: "manual",
      },
    );
    expect(session.status).toBe(302);
    const setCookie = session.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("container_session=");
    const cookieValue = setCookie.split(";")[0].split("=")[1];

    // 3) cookie'yi Path-scoped olarak kur — iframe kosullari
    await context.addCookies([
      {
        name: "container_session",
        value: cookieValue,
        domain: "localhost",
        path: `/containers/${CONTAINER_ID}/ui`,
      },
    ]);

    // 4) K4.1: iframe URL'i — hash router
    await page.goto(`/containers/${CONTAINER_ID}/ui/#/dashboard`);
    await page.waitForLoadState("networkidle");

    // 5) K4.2: login ekrani GORUNMEZ
    await expect(page.locator("text=Giriş").first()).toHaveCount(0);
    await expect(page.locator("input[type=password]")).toHaveCount(0);

    // 6) SPA govdesi render oldu (sidebar/dashboard isaretleri)
    await expect(page.locator("body")).not.toBeEmpty();
    // SystemHeader'da Field Baglantisi etiketi (Faz 2 PPC) gorunur
    await expect(page.getByText(/Field Bağlantısı|Field Link/).first()).toBeVisible({
      timeout: 15000,
    });

    // 7) Faz 3 kaniti: iframe icinden /api (tunelden) calisir
    const api = await page.evaluate(async () => {
      const res = await fetch(
        `${window.location.pathname.replace(/\/$/, "")}/api/auth/session`,
      );
      return res.ok ? await res.json() : { status: res.status };
    });
    expect((api as { user?: { role: string }; tunnel?: boolean }).tunnel).toBe(true);

    await context.close();
  });

  test("cookiesiz tünel URL'i 401 — login yerine hata (guvenlik)", async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: FIELD_BASE });
    const page = await context.newPage();
    const res = await fetch(`${FIELD_BASE}/containers/${CONTAINER_ID}/ui/`);
    expect(res.status).toBe(401);
    await context.close();
  });
});
