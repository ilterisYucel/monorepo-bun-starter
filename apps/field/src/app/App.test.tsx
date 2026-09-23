import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { TunnelBootstrap } from "./App";
import { hydrateSessionAuth } from "../features/auth/session-auth";
import { isTunnelMode } from "../lib/api-base";

vi.mock("../features/auth/session-auth", () => ({
  hydrateSessionAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("../lib/api-base", () => ({
  isTunnelMode: vi.fn(() => false),
  apiBaseUrl: vi.fn(() => "/api"),
  fieldRootPath: vi.fn((id: string) => `/field/${id}`),
}));

/**
 * TunnelBootstrap sözleşmesi (AUTH-REFRESH 2026-09-23 — UC-2 / AK-2.3):
 * - Standalone modda no-op — auto-guest DENENMEZ (K1; kullanıcı login
 *   ekranından girer).
 * - Tünel modunda `hydrateSessionAuth()` çağrılır (tünel hydrate'i korunur).
 * - Açılışta yalnızca BİR kez koşar (attempted guard'ı).
 */

describe("TunnelBootstrap (AUTH-REFRESH — UC-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isTunnelMode).mockReturnValue(false);
  });

  it("standalone: hydrate ÇAĞRILMAZ — auto-guest YOK (AK-2.3)", () => {
    render(<TunnelBootstrap />);
    expect(hydrateSessionAuth).not.toHaveBeenCalled();
  });

  it("tünel modu: hydrateSessionAuth ÇAĞRILIR (AK-2.3)", () => {
    vi.mocked(isTunnelMode).mockReturnValue(true);
    render(<TunnelBootstrap />);
    expect(hydrateSessionAuth).toHaveBeenCalledTimes(1);
  });

  it("yalnızca BİR kez koşar (tekrar render'da hydrate tekrar çağrılmaz)", () => {
    vi.mocked(isTunnelMode).mockReturnValue(true);
    const { rerender } = render(<TunnelBootstrap />);
    rerender(<TunnelBootstrap />);
    expect(hydrateSessionAuth).toHaveBeenCalledTimes(1);
  });
});
