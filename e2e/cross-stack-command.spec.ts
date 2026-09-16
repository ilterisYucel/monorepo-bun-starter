import { test, expect, type Page } from "@playwright/test";

const step = (name: string) => console.log("[E2E]", name);

/**
 * Çapraz yığın komut E2E (WS4 D3):
 *
 * Field UI oturumu içinden (Bearer admin) D3 komut proxy rotası çağrılır —
 * komut tünelden konteynerin KENDİ komut hattına gider (BSC-1 stop,
 * doğrulanmış sonuç); field Olaylar sayfasında `field_container_command`
 * audit'i görünür (traceId ile konteyner audit'iyle eşleşir).
 *
 * Ön koşul: field + container dev stack'leri, container-1 kayıtlı ve bağlı
 * (PPC: Bağlı), field UI 5174.
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:5174";
const FIELD_ID = process.env.FIELD_ID || "5d5e49dc-7757-4f3e-a026-0263c2966bc6";
const CONTAINER_ID = "container-1";
const ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD || "kurulum-yeni-sifre-456";
const FIELD_ROOT = FIELD_UI;

async function loginField(page: Page): Promise<void> {
  await page.goto(`${FIELD_ROOT}/login`);
  await page.getByPlaceholder("Kullanıcı adı").fill("admin");
  await page.getByPlaceholder("Şifre").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Giriş|Login/i }).click();
  await page.waitForURL(/\/field\//, { timeout: 15000 });
}

test.describe("Çapraz yığın komut (field → konteyner)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("D3 route → BSC-1 stop → doğrulanmış sonuç + field audit'i", async ({
    page,
  }) => {
    await loginField(page);
    step("1-login-ok");

    const result = await page.evaluate(
      async ({ fieldId, containerId }) => {
        const token = localStorage.getItem("auth-token");
        const res = await fetch(
          `/api/fields/${fieldId}/containers/${containerId}/commands`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${token ?? ""}`,
            },
            body: JSON.stringify({
              commands: [{ deviceId: "BSC-1", command: "stop" }],
              mode: "parallel",
              onFailure: "stop",
            }),
          },
        );
        return { status: res.status, body: (await res.text()).slice(0, 400) };
      },
      { fieldId: FIELD_ID, containerId: CONTAINER_ID },
    );
    step(`2-d3-response-${result.status}`);
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body).results[0]).toMatchObject({
      deviceId: "BSC-1",
      command: "stop",
      success: true,
    });

    // Field Olaylar sayfası — field_container_command audit'i
    await page.goto(`${FIELD_UI}/field/${FIELD_ID}/events`);
    step("3-events-page");
    await expect(
      page.locator("text=/field_container_command/").first(),
    ).toBeVisible({ timeout: 30000 });
    step("4-audit-visible");
  });
});
