import { test, expect } from "@playwright/test";

/**
 * Faz 5.1 B5 E2E — konteyner app dev modu realtime:
 * Vite (5173) `/ws` proxy → web-service (5001) → canlı telemetri.
 *
 * B5 öncesi dev modunda WS bağlantısı 404'e düşüyordu (Vite proxy'si yoktu) —
 * konteyner app yalnızca tünel modunda canlı veri alıyordu.
 *
 * Ön koşul: container dev stack (web-service 5001, Vite dev 5173) + geçerli
 * kimlik. Canlı stack'te admin şifresi kurulumda değiştirildiyse ya
 * `CONTAINER_ADMIN_PASSWORD` ya da `CONTAINER_ACCESS_TOKEN` (hazır access JWT)
 * verilir; ikisi de verilmezse seed varsayılanı (admin123) denenir.
 */

const CONTAINER_UI = process.env.CONTAINER_UI_URL || "http://localhost:5173";
const CONTAINER_PASSWORD = process.env.CONTAINER_ADMIN_PASSWORD || "admin123";
const CONTAINER_ACCESS_TOKEN = process.env.CONTAINER_ACCESS_TOKEN;

test.describe("Faz 5.1 B5 — konteyner realtime (Vite /ws proxy)", () => {
  test("5173 üzerinden WS aboneliği canlı telemetri alır", async ({ page }) => {
    // 1) kimlik: hazır token varsa kullan, yoksa giriş (Vite proxy üzerinden)
    let accessToken = CONTAINER_ACCESS_TOKEN;
    if (!accessToken) {
      const login = await page.request.post(`${CONTAINER_UI}/api/auth/login`, {
        data: { username: "admin", password: CONTAINER_PASSWORD },
      });
      expect(login.ok()).toBe(true);
      ({ accessToken } = await login.json());
    }
    expect(accessToken).toBeTruthy();

    // 2) WS aboneliği — Vite /ws proxy'si üzerinden (B5)
    const uiUrl = new URL(CONTAINER_UI);
    const received = await page.evaluate(
      ({ wsUrl }) =>
        new Promise<unknown>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("WS veri zamanasimi (15sn)")),
            15000,
          );
          const ws = new WebSocket(wsUrl);
          ws.onopen = () =>
            ws.send(JSON.stringify({ type: "subscribe", deviceId: "BSC-1" }));
          ws.onmessage = (ev) => {
            const msg = JSON.parse(String(ev.data));
            if (
              msg.type === "telemetry" &&
              Array.isArray(msg.data) &&
              msg.data.length > 0
            ) {
              clearTimeout(timeout);
              ws.close();
              resolve(msg.data[0]);
            }
          };
          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("WS baglanti hatasi"));
          };
        }),
      { wsUrl: `ws://${uiUrl.host}/ws/telemetry?token=${accessToken}` },
    );
    expect(received).toBeTruthy();
  });
});
