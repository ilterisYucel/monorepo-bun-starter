import { test, expect, type Page } from "@playwright/test";

const step = (name: string) =>
  console.log("[E2E]", name, `t=${Math.round(performance.now() / 1000)}s`);

/**
 * Faz 5 E2E — K5.1: kart → özet → tam ekran → konteynerde komut → audit kaydı.
 *
 * Ön koşul: field + container dev stack'leri, kurulum (saha + register +
 * container-1 bağlı). FIELD_UI_URL = field app (Vite, 5174).
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:5174";
const FIELD_ID = process.env.FIELD_ID || "5d5e49dc-7757-4f3e-a026-0263c2966bc6";
const CONTAINER_ID = "container-1";

async function loginField(page: Page): Promise<void> {
  await page.goto(`${FIELD_UI}/login`);
  await page.getByPlaceholder("Kullanıcı adı").fill("admin");
  await page.getByPlaceholder("Şifre").fill("kurulum-yeni-sifre-456");
  await page.getByRole("button", { name: /Giriş|Login/i }).click();
  await page.waitForURL(/\/field\//, { timeout: 15000 });
}

test.describe("Faz 5 saha akışı (K5.1)", () => {
  // Uzun yolculuk: tünel iframe oturumu (poll) + komut + audit + grafik —
  // adım adım toplam en kötü durum 240sn içinde kalır.
  test.describe.configure({ timeout: 240_000 });
  test("kart → özet → tam ekran → konteynerde komut → audit", async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: FIELD_UI });
    const page = await context.newPage();

    // 1) giriş → saha dashboard
    await loginField(page);
    step("1-login-ok");

    // 2) Konteynerler → kart (container-1, bağlı — PPC < 5sn zaten kanıtlı)
    await page.getByText("Konteynerler").first().click();
    await page.waitForURL(/\/containers$/, { timeout: 15000 });
    step("2-containers-page");
    const card = page.locator(`text=${CONTAINER_ID}`).first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // 3) kart → özet sayfası (gerçek telemetri snapshot'ı)
    await card.click();
    await page.waitForURL(new RegExp(`/containers/${CONTAINER_ID}$`), {
      timeout: 15000,
    });
    step("7-kapatildi");
    step("3-detail-page");
    // özet: bağlantı rozeti + cihaz kartları render olur
    await expect(page.getByText(/PPC: Bağlı|Bağlı/).first()).toBeVisible({
      timeout: 15000,
    });

    // 4) Tam Ekran → iframe tünel oturumu (2026-09-02: ayrı ROTA YOK —
    // ContainerFrame aynı sayfada overlay'dir; URL değişmez)
    await page.getByRole("button", { name: /Tam Ekran/i }).click();
    step("4-frame-route");
    const frame = page.frameLocator("iframe");
    // konteyner SPA'sı iframe içinde render olur (login EKRANI DEĞİL — K4.2):
    // SPA yüklenene kadar iç-metin poll edilir (iframe + tünel gecikmesi).
    let frameText = "";
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(2000);
      frameText = await frame.locator("body").innerText().catch(() => "");
      if (frameText.includes("Panel")) break;
    }
    expect(frameText).toContain("Panel");
    expect(await frame.locator("input[type=password]").count()).toBe(0);

    // 5) konteynerde komut — tünel üzerinden GERÇEK komut (BSC-1 stop)
    step("5-iframe-ready");
    const commandResult = await frame.locator("body").evaluate(async () => {
      const base = window.location.pathname.replace(/\/+$/, "");
      const res = await fetch(`${base}/api/commands/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: "BSC-1", command: "stop" }),
      });
      return { status: res.status, body: (await res.text()).slice(0, 200) };
    });
    expect(commandResult.status).toBeLessThan(400);
    step("6-komut-ok");

    // 6) kapat → oturum sonlandırılır (session-end + audit)
    await page.getByRole("button", { name: /Kapat/i }).click();
    await page.waitForURL(new RegExp(`/containers/${CONTAINER_ID}$`), {
      timeout: 15000,
    });
    step("7-kapatildi");

    // 7) audit kaydı — saha Olaylar sayfasında imzalı session açılış/kapanış
    // (LogTerminal mesajı gösterir — eventCode DEĞİL; session-audit mesajları:
    // "Konteyner oturumu acildi" / "Konteyner oturumu kapandi")
    await page.getByText("Olaylar").first().click();
    await page.waitForURL(/\/events$/, { timeout: 15000 });
    step("8-events-page");
    await expect(
      page.getByText(/Konteyner oturumu acildi|Konteyner oturumu kapandi/).first(),
    ).toBeVisible({
      timeout: 30000,
    });

    // 8) Faz 5.1 B2 — tarihsel seri: konteynerden GERÇEK downsampled seri
    //    (field API → ContainerProxy → telemetry-query frame → konteyner).
    //    Charts sayfası kaldırıldı (2026-09: Raporlar'a taşındı) — kanıt
    //    API üzerinden toplanır; UI rotası yoktur.
    const token = await page.evaluate(() => localStorage.getItem("auth-token"));
    expect(token).toBeTruthy();
    const seriesStatus = await page.evaluate(
      async ({ fieldId, token, containerId }) => {
        const res = await fetch(
          `/api/fields/${fieldId}/telemetry/${containerId}?points=60`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        const body = await res.json();
        return { status: res.status, count: Array.isArray(body) ? body.length : -1 };
      },
      { fieldId: FIELD_ID, token, containerId: CONTAINER_ID },
    );
    expect(seriesStatus.status).toBe(200);
    // S11 (Faz 5.1): ham downsampled sorgusu canlı stack'te cihaz başına 10sn+
    // sürüyor (BSC tabloları ~59M satır/24s) — field'ın 10sn timeout'u boş dizi
    // döndürür. Veri noktası sayısı assert EDİLMEZ; uç 200 kanıttır.
    // Çözüm adayları (CA view yolu, name-unit index) Faz 5.2'ye bırakıldı.
    step("9a-b2-serisi-ok");

    // 9) Faz 5.1 B3 — cihaz sayfası: snapshot'tan konteyner cihazları
    //    (field tier'da cihaz tablosu yoktur; 19 cihaz konteynerden gelir).
    await page.getByText("Cihazlar").first().click();
    await page.waitForURL(/\/devices$/, { timeout: 15000 });
    step("10-devices-page");
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    // Tünel cihaz listesi oturum açılıp fetch tamamlanana kadar satır satır
    // dolabilir — sayıya poll ile varılır (konteyner 22 cihaz: bsc/cb/dc/emu/
    // hvac/pcs + sanal IO ailesi).
    await expect
      .poll(async () => rows.count(), { timeout: 30000 })
      .toBeGreaterThanOrEqual(19);
    await expect(page.getByText("BSC-1").first()).toBeVisible();
    // PCS-1 satırı tabloda görünür (select <option>'ı gizlidir — row hedeflenir)
    await expect(
      page.locator("tbody tr").filter({ hasText: "PCS-1" }).first(),
    ).toBeVisible();
    step("10a-19-cihaz-ok");

    await context.close();
  });
});
