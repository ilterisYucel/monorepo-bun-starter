import { describe, it, expect, vi } from "vitest";
import { Result } from "./result";

/**
 * T0.2 — Result<T,E> JSDoc kontratı (TESTING.md §8.1; tasarım Faz 0 ek 2):
 *
 * - İki durum: ok(T) veya err(E). İkisi birden olamaz; ikisi de boş olamaz.
 * - null/undefined değer kabul edilmez — "yok" anlamı Result durumuyla ifade edilir.
 * - Statik fabrikalar `Result.ok` / `Result.err` (Elegant Object factory istisnası).
 * - Sorgular: `isOk()`, `isErr()`, `unwrap()` (err'de fırlatır), `error()` (ok'da
 *   fırlatır), `unwrapOr(fallback)`.
 * - Dönüşümler (immutable — yeni Result döner): `map`, `andThen`, `match`.
 * - Saf veri taşıyıcıdır — yan etki YOKTUR.
 */

describe("Result<T,E> (T0.2)", () => {
  describe("ok()", () => {
    it("başarı durumu taşır", () => {
      const r = Result.ok<number, string>(42);
      expect(r.isOk()).toBe(true);
      expect(r.isErr()).toBe(false);
      expect(r.unwrap()).toBe(42);
    });

    it("null kabul etmez — constructor doğrular", () => {
      // @ts-expect-error — null geçersiz değerdir
      expect(() => Result.ok<null, string>(null)).toThrow();
    });

    it("undefined kabul etmez — constructor doğrular", () => {
      expect(() =>
        // @ts-expect-error — undefined geçersiz değerdir
        Result.ok<undefined, string>(undefined),
      ).toThrow();
    });
  });

  describe("err()", () => {
    it("hata durumu taşır", () => {
      const r = Result.err<number, string>("modbus_timeout");
      expect(r.isErr()).toBe(true);
      expect(r.isOk()).toBe(false);
      expect(r.error()).toBe("modbus_timeout");
    });

    it("undefined hata kabul etmez", () => {
      expect(() =>
        // @ts-expect-error — undefined geçersiz hatadır
        Result.err<number, undefined>(undefined),
      ).toThrow();
    });
  });

  describe("unwrap / error sınırları", () => {
    it("err üzerinde unwrap fırlatır", () => {
      const r = Result.err<number, string>("boom");
      expect(() => r.unwrap()).toThrow();
    });

    it("ok üzerinde error() fırlatır", () => {
      const r = Result.ok<number, string>(1);
      expect(() => r.error()).toThrow();
    });

    it("unwrapOr hata durumunda fallback döner", () => {
      const r = Result.err<number, string>("boom");
      expect(r.unwrapOr(7)).toBe(7);
    });

    it("unwrapOr başarı durumunda değeri döner", () => {
      const r = Result.ok<number, string>(5);
      expect(r.unwrapOr(7)).toBe(5);
    });
  });

  describe("map", () => {
    it("ok üzerinde dönüşüm uygular", () => {
      const r = Result.ok<number, string>(2).map((v) => v * 10);
      expect(r.isOk()).toBe(true);
      expect(r.unwrap()).toBe(20);
    });

    it("err üzerinde dönüşüm uygulamaz — hatayı korur", () => {
      const fn = vi.fn();
      const r = Result.err<number, string>("boom").map(fn);
      expect(fn).not.toHaveBeenCalled();
      expect(r.isErr()).toBe(true);
      expect(r.error()).toBe("boom");
    });
  });

  describe("andThen", () => {
    it("ok üzerinde zincirler ve yeni Result döner", () => {
      const r = Result.ok<number, string>(2).andThen((v) =>
        v > 0 ? Result.ok<number, string>(v + 1) : Result.err<number, string>("neg"),
      );
      expect(r.unwrap()).toBe(3);
    });

    it("err üzerinde zincirlemez — hatayı korur", () => {
      const fn = vi.fn();
      const r = Result.err<number, string>("boom").andThen(fn);
      expect(fn).not.toHaveBeenCalled();
      expect(r.error()).toBe("boom");
    });
  });

  describe("match", () => {
    it("ok kolunu çalıştırır", () => {
      const out = Result.ok<number, string>(3).match(
        (v) => `ok:${v}`,
        (e) => `err:${e}`,
      );
      expect(out).toBe("ok:3");
    });

    it("err kolunu çalıştırır", () => {
      const out = Result.err<number, string>("x").match(
        (v) => `ok:${v}`,
        (e) => `err:${e}`,
      );
      expect(out).toBe("err:x");
    });
  });

  describe("immutability", () => {
    it("map/andThen mevcut nesneyi değiştirmez", () => {
      const r = Result.ok<number, string>(1);
      const mapped = r.map((v) => v + 1);
      expect(r.unwrap()).toBe(1);
      expect(mapped.unwrap()).toBe(2);
    });

    it("her üretim yeni örnektir", () => {
      expect(Result.ok(1)).not.toBe(Result.ok(1));
    });

    it("okVoid değersiz başarı üretir (komut tipi işlemler)", () => {
      const r = Result.okVoid<void, string>();
      expect(r.isOk()).toBe(true);
      expect(r.isErr()).toBe(false);
      // NOT: unwrap() dönüş değeri anlamsızdır — yalnızca durum sorgulanır
    });

    it("okVoid hata taşıyamaz — err ayrı factory'dir", () => {
      const r = Result.err<void, string>("kapali");
      expect(r.isErr()).toBe(true);
      expect(r.error()).toBe("kapali");
    });
  });
});
