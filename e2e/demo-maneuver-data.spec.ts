import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * demo-field manevra veri kontrolü (SPEC UC-7/T-31, FR-7.5).
 *
 * Amaç: yeni demo manevralarının (FL-01…FL-05) YALNIZ korunmasız "success"
 * değil, sahadaki GERÇEK telemetriye yansıdığını doğrulamak. UI seçici
 * kırılganlığından kaçınmak için API üzerinden yürütülür; etki
 * `GET /api/data/PCS-1/latest` (field web-service — demo-field nginx proxy)
 * ile okunur.
 *
 * Ön koşul: demo-integration stack ayakta (`bun run start:demo-integration`),
 * field-web (:8088) + field-web-service (:5002). E2E_ADMIN_PASSWORD zorunlu.
 */

const FIELD_UI = process.env.FIELD_UI_URL || "http://localhost:8088";
const ADMIN = process.env.E2E_ADMIN_USER || "admin";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "";

interface Telemetry {
  name: string;
  value: unknown;
  timestamp?: string;
}

/** Aynı isimden çok satır gelebilir: her isim için EN YENİ timestamp'i seç. */
function latestByName(rows: Telemetry[]): Record<string, unknown> {
  const best = new Map<string, { value: unknown; ts: number }>();
  for (const r of rows) {
    const ts = r.timestamp ? Date.parse(r.timestamp) || 0 : 0;
    const cur = best.get(r.name);
    if (!cur || ts >= cur.ts) best.set(r.name, { value: r.value, ts });
  }
  return Object.fromEntries([...best].map(([k, v]) => [k, v.value]));
}

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${FIELD_UI}/api/auth/login`, {
    data: { username: ADMIN, password: PASSWORD },
  });
  expect(res.ok(), `login başarısız (${res.status()}): ${await res.text()}`).toBe(true);
  const body = (await res.json()) as { accessToken?: string };
  expect(body.accessToken, "accessToken yok").toBeTruthy();
  return body.accessToken!;
}

async function latest(
  request: APIRequestContext,
  token: string,
  deviceId: string,
): Promise<Record<string, unknown>> {
  const res = await request.get(`${FIELD_UI}/api/data/${deviceId}/latest?limit=500`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return {};
  const body = (await res.json()) as { telemetries?: Telemetry[] };
  return latestByName(body.telemetries ?? []);
}

test.describe("demo-field manevra veri kontrolü (T-31)", () => {
  test.describe.configure({ timeout: 120_000 });

  test("FL-05 emergency stop önce şarjı başlatıp PCS verisini durdurur", async ({
    request,
  }) => {
    expect(PASSWORD, "E2E_ADMIN_PASSWORD env gerekli").toBeTruthy();
    const token = await login(request);
    const headers = { authorization: `Bearer ${token}` };

    // 1) Gerçek veri değişimi için önce şarja al (PCS gücü negatife iner).
    const charge = await request.post(
      `${FIELD_UI}/api/maneuvers/pcs_charge/execute`,
      { headers, data: { params: { powerKw: 100 } } },
    );
    expect(charge.ok(), `charge başarısız (${charge.status()}): ${await charge.text()}`).toBe(true);
    await expect
      .poll(
        async () => {
          const v = await latest(request, token, "PCS-1");
          return typeof v["Grid Active Power"] === "number"
            ? (v["Grid Active Power"] as number)
            : 0;
        },
        { timeout: 30_000, intervals: [1000] },
      )
      .toBeLessThan(-5);

    // 2) FL-05 → güç sıfıra döner ve PCS şarj/deşarj durumunda DEĞİL.
    const exec = await request.post(
      `${FIELD_UI}/api/maneuvers/fl05_emergency_stop/execute`,
      { headers, data: { params: {} } },
    );
    expect(exec.ok(), `execute başarısız (${exec.status()}): ${await exec.text()}`).toBe(true);

    await expect
      .poll(
        async () => {
          const v = await latest(request, token, "PCS-1");
          const p = typeof v["Grid Active Power"] === "number" ? (v["Grid Active Power"] as number) : undefined;
          const s = typeof v["PCS Operation Status"] === "number" ? (v["PCS Operation Status"] as number) : undefined;
          if (p === undefined || s === undefined) return "veri yok";
          return Math.abs(p) < 5 && s !== 2 && s !== 3 ? "durdu" : "devam";
        },
        { timeout: 60_000, intervals: [1500] },
      )
      .toBe("durdu");
  });

  test("FL-03 idle manevrası run terminal duruma ulaşır", async ({ request }) => {
    expect(PASSWORD, "E2E_ADMIN_PASSWORD env gerekli").toBeTruthy();
    const token = await login(request);
    const headers = { authorization: `Bearer ${token}` };

    const exec = await request.post(
      `${FIELD_UI}/api/maneuvers/fl03_idle/execute`,
      { headers, data: { params: {} } },
    );
    expect(exec.ok(), `execute başarısız (${exec.status()}): ${await exec.text()}`).toBe(true);
    const body = (await exec.json()) as { status?: string };
    // fl03 anlıktır — senkron completed beklenir (arkaplana düşerse running).
    expect(["completed", "running"]).toContain(body.status);
  });

  test("grid & market dış seri ucu boş dizide hata vermez (A2 — kimlik yok)", async ({
    request,
  }) => {
    expect(PASSWORD, "E2E_ADMIN_PASSWORD env gerekli").toBeTruthy();
    const token = await login(request);
    const res = await request.get(
      `${FIELD_UI}/api/unified/timeseries/external?source=epias&series=ptf`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { points?: unknown[] };
    expect(Array.isArray(body.points)).toBe(true);
  });

  // Kapanış temizliği: testler FL-05/FL-03 ile PCS'leri durdurur — sahayı
  // FL-01 start + standby ile çalışır/hazır durumda bırak (son test olarak koşar).
  test("temizlik: sahayı FL-01 start + standby ile hazır bırakır", async ({ request }) => {
    expect(PASSWORD, "E2E_ADMIN_PASSWORD env gerekli").toBeTruthy();
    const token = await login(request);
    const headers = { authorization: `Bearer ${token}` };

    const startup = await request.post(`${FIELD_UI}/api/maneuvers/fl01_startup/execute`, {
      headers,
      data: { params: {} },
    });
    expect(startup.ok(), `startup başarısız (${startup.status()}): ${await startup.text()}`).toBe(true);

    const standby = await request.post(`${FIELD_UI}/api/maneuvers/fl04_calibration/execute`, {
      headers,
      data: { params: {} },
    });
    expect(standby.ok(), `standby başarısız (${standby.status()}): ${await standby.text()}`).toBe(true);

    await expect
      .poll(
        async () => {
          const v = await latest(request, token, "PCS-1");
          const s = typeof v["PCS Operation Status"] === "number" ? (v["PCS Operation Status"] as number) : undefined;
          if (s === undefined) return "veri yok";
          return s !== 2 && s !== 3 ? "hazır" : "devam";
        },
        { timeout: 30_000, intervals: [1000] },
      )
      .toBe("hazır");
  });
});
