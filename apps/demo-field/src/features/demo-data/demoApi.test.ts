import { describe, it, expect, vi, beforeEach } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn().mockResolvedValue({ data: {} }) }));

vi.mock("../../lib/api-client", () => ({
  apiClient: { post, get: vi.fn() },
}));

import { demoApi } from "./demoApi";

/**
 * UC-13 regresyon testi: `systems` POST gövdesine GİTMELİ (K-17 — istasyon bazlı
 * uzak yürütme). Bu alan düşerse tüm komutlar config varsayılanı container-1'e
 * gider (canlı bug kök nedeni).
 */
describe("demoApi execute — systems passthrough (UC-13)", () => {
  beforeEach(() => post.mockClear());

  it("executeOperation systems gönderir", async () => {
    await demoApi.executeOperation("charge", { params: { powerKw: 200 }, systems: ["container-2"] });
    const [url, body] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe("/operations/charge/execute");
    expect(body.systems).toEqual(["container-2"]);
  });

  it("executeManeuver systems gönderir", async () => {
    await demoApi.executeManeuver("fl01_startup", { systems: ["container-1"] });
    const [url, body] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect(url).toBe("/maneuvers/fl01_startup/execute");
    expect(body.systems).toEqual(["container-1"]);
  });

  it("systems yokken gönderilmez", async () => {
    await demoApi.executeOperation("standby", {});
    const [, body] = post.mock.calls[0] as [string, Record<string, unknown>];
    expect("systems" in body).toBe(false);
  });
});
