import { test, expect } from "@playwright/test";
import { FIELD_UI, fieldId, loginUi, prepareSite, uiToken } from "./_site";

/**
 * E2E-2 — Kritik yolculuk: **operatör şarj talimatı → saha gücü yansır**.
 *
 * SPEC: BAGIMLILIK-YONU-VE-TEST-DUZENI / K13. Kullanıcı UI'dan giriş yapar;
 * şarj talimatı UI'ın kullandığı `/api/operations/charge/execute` ucuyla verilir
 * ve sonuç **sahadan** (PCS gücü) doğrulanır.
 *
 * Ön koşul: `prepareSite()` (BSC Normal + PCS güç 0) — sıra bağımlılığı yok.
 */

test.describe.configure({ mode: "serial", timeout: 180_000 });

test("E2E-2: şarj talimatı → PCS gücü negatif, UI cihaz listesinde görünür", async ({
  page,
  request,
}) => {
  const id = fieldId();
  test.skip(!id, "FIELD_ID yok (demo stack ayakta mı?)");
  await prepareSite();

  // 1) Kullanıcı girişi (UI) ve saha görünümü.
  await loginUi(page);
  await page.goto(`${FIELD_UI}/field/${id}`);
  await expect(page.getByRole("tab", { name: "Devices" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("tab", { name: "Devices" }).click();
  await expect(page.getByText("PCS", { exact: false }).first()).toBeVisible({ timeout: 20_000 });

  // 2) Operatör talimatı (UI aksiyonunun API karşılığı).
  const auth = await uiToken(request);
  const exec = await request.post(`${FIELD_UI}/api/operations/charge/execute`, {
    headers: { authorization: `Bearer ${auth}` },
    data: { params: { powerKw: 200 }, deviceIds: ["PCS-1", "PCS-2"] },
  });
  expect([200, 202]).toContain(exec.status());

  // 3) Sahadan doğrulama: güç negatif (şarj yönü).
  await expect
    .poll(
      async () => {
        const res = await request.get(`${FIELD_UI}/api/unified/telemetry/latest?deviceIds=PCS-1`, {
          headers: { authorization: `Bearer ${auth}` },
        });
        interface Row {
          name: string;
          value: unknown;
          tags?: { canonical?: string };
        }
        const rows = ((await res.json()) as { telemetries?: Row[] }).telemetries ?? [];
        const row = rows.find(
          (r) => r.tags?.canonical === "power_kw" || r.name === "Grid Active Power",
        );
        return Number(row?.value ?? 0);
      },
      { timeout: 90_000, interval: 3_000, message: "PCS gücü negatife inmedi" },
    )
    .toBeLessThan(0);

  // 4) Temizlik: standby (sonraki akışlar temiz başlasın).
  await request.post(`${FIELD_UI}/api/operations/standby/execute`, {
    headers: { authorization: `Bearer ${auth}` },
    data: { params: {}, deviceIds: ["PCS-1", "PCS-2"] },
  });
});
