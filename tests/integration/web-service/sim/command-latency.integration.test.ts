import { describe, expect, it, beforeAll } from "vitest";
import { FIELD_URL, assertHealthy, login, api } from "../helpers";

/**
 * Komut gecikmesi (I-C sim-protokol katmanı) — C5'in yeni evi.
 * `data` katmanı simülasyona dokunmaz (SPEC v2 / SC-3).
 */
let fieldToken = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  fieldToken = await login(FIELD_URL);
});

describe("komut gecikmesi (fire-and-forget)", () => {
  it("komut yanıtı hızlı (P95 < 500 ms)", async () => {
    const latencies: number[] = [];
    // `charge` durmuş PCS'te doğrulanamaz (S06 yalnız çalışırken uygulanır →
    // 5 s validation timeout). Latency ölçümü için durumdan bağımsız,
    // idempotent bir komut kullanılır.
    for (let i = 0; i < 10; i++) {
      const t0 = Date.now();
      const { status } = await api(
        FIELD_URL,
        fieldToken,
        "/api/commands/execute",
        {
          method: "POST",
          body: JSON.stringify({
            deviceId: "PCS-1",
            command: "set_command_source",
          }),
        },
      );
      expect(status).toBe(200);
      latencies.push(Date.now() - t0);
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 =
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
    expect(p95).toBeLessThan(500);
  }, 60_000);
});
