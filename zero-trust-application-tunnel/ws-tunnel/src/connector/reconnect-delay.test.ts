import { describe, it, expect } from "vitest";
import { ReconnectDelay } from "./reconnect-delay";

/**
 * T2.1a — ReconnectDelay sözleşmesi (tasarım §6 diyagramı):
 *
 * - backoff → connecting geçişi `exp(2^n·1s)+jitter, max 60s` ile yapılır.
 * - `delayFor(attempt)` komuttur-ve-sorgudur ayrımı istisnası (saf hesap):
 *   attempt 1 tabanlıdır; delay = min(maxMs, baseMs · 2^(attempt-1) + jitter()·jitterSpanMs).
 * - `reset()` komuttur (void): başarılı bağlantıda deneme sayacı sıfırlanır.
 * - Attempt < 1 → ValidationError (beklenmeyen kullanım).
 * - Konfigürasyon dondurulur (immutable — Elegant Object kural 3).
 * - jitter enjekte edilir — testlerde deterministik (() => 0).
 */

describe("ReconnectDelay (T2.1a)", () => {
  const zero = () => 0;

  describe("delayFor()", () => {
    it("attempt 1 → taban gecikme (1000 ms)", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: zero });
      expect(d.delayFor(1)).toBe(1000);
    });

    it("üstel büyür: 1→1000, 2→2000, 3→4000, 4→8000", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: zero });
      expect([d.delayFor(1), d.delayFor(2), d.delayFor(3), d.delayFor(4)]).toEqual([
        1000, 2000, 4000, 8000,
      ]);
    });

    it("60 sn tavanına takılır (attempt 7: 64000 → 60000)", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: zero });
      expect(d.delayFor(7)).toBe(60000);
    });

    it("tavan üstü attempt'lerde de tavanı korur (attempt 100)", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: zero });
      expect(d.delayFor(100)).toBe(60000);
    });

    it("jitter'ı ekler (deterministik jitter 0.5 → +500 ms)", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: () => 0.5 });
      expect(d.delayFor(1)).toBe(1500);
    });

    it("jitter tavanı ezemez", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: () => 0.999 });
      expect(d.delayFor(7)).toBe(60000);
    });

    it("jitter [0,1) dışında ise reddeder", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: () => 1.5 });
      expect(() => d.delayFor(1)).toThrow();
    });

    it("attempt 0 ve negatif attempt reddedilir", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: zero });
      expect(() => d.delayFor(0)).toThrow();
      expect(() => d.delayFor(-3)).toThrow();
    });

    it("ondalıklı attempt reddedilir", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: zero });
      expect(() => d.delayFor(1.5)).toThrow();
    });
  });

  describe("reset()", () => {
    it("deneme sayacını sıfırlar — sonraki delay yeniden tabandan başlar", () => {
      const d = new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: 1000, jitter: zero });
      expect(d.delayFor(3)).toBe(4000);
      d.reset();
      expect(d.delayFor(1)).toBe(1000);
    });
  });

  describe("konfigürasyon doğrulaması", () => {
    it("geçersiz taban (≤0) reddedilir", () => {
      expect(
        () => new ReconnectDelay({ baseMs: 0, maxMs: 60000, jitterSpanMs: 1000, jitter: zero }),
      ).toThrow();
    });

    it("tavan tabandan küçük olamaz", () => {
      expect(
        () => new ReconnectDelay({ baseMs: 60000, maxMs: 1000, jitterSpanMs: 1000, jitter: zero }),
      ).toThrow();
    });

    it("negatif jitter açıklığı reddedilir", () => {
      expect(
        () => new ReconnectDelay({ baseMs: 1000, maxMs: 60000, jitterSpanMs: -5, jitter: zero }),
      ).toThrow();
    });
  });
});
