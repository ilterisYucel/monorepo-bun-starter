import { describe, it, expect } from "vitest";
import {
  DomainError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TransientError,
  FatalError,
} from "./domain-error";
import type { ErrorKind } from "./domain-error";

/**
 * T0.2 — DomainError hiyerarşisi JSDoc kontratı (TESTING.md §8.1):
 *
 * - `DomainError` beklenmeyen hataların tabanıdır — Fırlatılır (throw).
 *   Beklenen alan hataları Result<T,E> ile taşınır, buraya girmez.
 * - Alanlar: `code` (sabit kod, snake_case), `message` (boş olamaz — constructor
 *   doğrular), `kind` (ErrorKind), `retryable` (boolean), `context` (opsiyonel),
 *   `cause` (opsiyonel neden zinciri). Tümü readonly — immutable.
 * - Alt sınıflar tek primary constructor ile kind/retryable'ı sabitler:
 *   ValidationError(validation,false), NotFoundError(not_found,false),
 *   UnauthorizedError(unauthorized,false), ForbiddenError(forbidden,false),
 *   ConflictError(conflict,false), TransientError(transient,true),
 *   FatalError(fatal,false).
 */

describe("DomainError hiyerarşisi (T0.2)", () => {
  describe("DomainError tabanı", () => {
    it("tüm alanları korur", () => {
      const cause = new Error("pg connection refused");
      const err = new DomainError("db_unreachable", "Veritabanına ulaşılamadı", {
        kind: "transient",
        retryable: true,
        context: { host: "db:5432" },
        cause,
      });
      expect(err.code).toBe("db_unreachable");
      expect(err.message).toBe("Veritabanına ulaşılamadı");
      expect(err.kind).toBe("transient");
      expect(err.retryable).toBe(true);
      expect(err.context).toEqual({ host: "db:5432" });
      expect(err.cause).toBe(cause);
    });

    it("boş message kabul etmez — constructor doğrular", () => {
      expect(
        () => new DomainError("x", "", { kind: "fatal", retryable: false }),
      ).toThrow();
    });

    it("boş code kabul etmez", () => {
      expect(
        () => new DomainError("", "msg", { kind: "fatal", retryable: false }),
      ).toThrow();
    });

    it("varsayılanlar: context boş, cause yok", () => {
      const err = new DomainError("x", "msg", {
        kind: "fatal",
        retryable: false,
      });
      expect(err.context).toEqual({});
      expect(err.cause).toBeUndefined();
    });

    it("Error zincirinin parçasıdır", () => {
      const err = new DomainError("x", "msg", {
        kind: "fatal",
        retryable: false,
      });
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe("alt sınıf kind/retryable sabitlemesi", () => {
    const cases: Array<{
      name: string;
      build: () => DomainError;
      kind: ErrorKind;
      retryable: boolean;
    }> = [
      {
        name: "ValidationError",
        build: () => new ValidationError("invalid_input", "geçersiz girdi"),
        kind: "validation",
        retryable: false,
      },
      {
        name: "NotFoundError",
        build: () => new NotFoundError("device_missing", "cihaz yok"),
        kind: "not_found",
        retryable: false,
      },
      {
        name: "UnauthorizedError",
        build: () => new UnauthorizedError("bad_token", "sahte token"),
        kind: "unauthorized",
        retryable: false,
      },
      {
        name: "ForbiddenError",
        build: () => new ForbiddenError("no_field_access", "yetkisiz"),
        kind: "forbidden",
        retryable: false,
      },
      {
        name: "ConflictError",
        build: () => new ConflictError("session_exists", "oturum var"),
        kind: "conflict",
        retryable: false,
      },
      {
        name: "TransientError",
        build: () => new TransientError("modbus_timeout", "timeout"),
        kind: "transient",
        retryable: true,
      },
      {
        name: "FatalError",
        build: () => new FatalError("schema_mismatch", "şema bozuk"),
        kind: "fatal",
        retryable: false,
      },
    ];

    for (const c of cases) {
      it(`${c.name} → kind=${c.kind}, retryable=${c.retryable}`, () => {
        const err = c.build();
        expect(err.kind).toBe(c.kind);
        expect(err.retryable).toBe(c.retryable);
        expect(err.code).toBeTruthy();
        expect(err.message).toBeTruthy();
      });
    }

    it("alt sınıflar context/cause seçeneklerini kabul eder", () => {
      const err = new TransientError("modbus_timeout", "timeout", {
        context: { deviceId: "bsc-1" },
      });
      expect(err.context).toEqual({ deviceId: "bsc-1" });
      expect(err.cause).toBeUndefined();
    });

    it("kind üzerine yazılamaz — alt sınıf kimliği korunur", () => {
      const err: DomainError = new ValidationError("x", "y");
      expect(err.kind).toBe("validation");
    });
  });
});
