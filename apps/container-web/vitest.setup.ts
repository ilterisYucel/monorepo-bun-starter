import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom ortamında eksik tarayıcı API'leri — vitest setup.
// @gd-monorepo/ui barrel'ı uplot'u module scope'ta yükler; uplot
// matchMedia kullanır (jsdom'da yok). ELEGANT-EXCEPTION: test çevre stub'ı.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  });
}
