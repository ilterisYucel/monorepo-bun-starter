import { describe, it, expect } from "vitest";
import { Result } from "./result";
import {
  ConflictError,
  DomainError,
  FatalError,
  ForbiddenError,
  NotFoundError,
  TransientError,
  UnauthorizedError,
  ValidationError,
} from "./domain-error";

/** Yerel Result + hata taksonomisi — monorepo paketiyle birebir API. */
describe("yerel Result", () => {
  it("ok/err durumları ve değer erişimi", () => {
    const ok = Result.ok<number, string>(1);
    expect(ok.isOk()).toBe(true);
    expect(ok.isErr()).toBe(false);
    expect(ok.unwrap()).toBe(1);

    const err = Result.err<number, string>("boom");
    expect(err.isErr()).toBe(true);
    expect(err.error()).toBe("boom");
  });

  it("okVoid değersiz başarı üretir", () => {
    const voidResult = Result.okVoid<void, string>();
    expect(voidResult.isOk()).toBe(true);
    expect(voidResult.unwrap()).toBeDefined();
  });

  it("unwrapOr fallback uygular", () => {
    expect(Result.ok<number, string>(5).unwrapOr(0)).toBe(5);
    expect(Result.err<number, string>("x").unwrapOr(0)).toBe(0);
  });

  it("map/andThen/match hata taşır", () => {
    expect(Result.ok<number, string>(2).map((n) => n * 2).unwrap()).toBe(4);
    expect(
      Result.ok<number, string>(2)
        .andThen((n) => Result.ok<number, string>(n + 1))
        .unwrap(),
    ).toBe(3);
    expect(Result.ok<number, string>(2).match((n) => n + 1, () => -1)).toBe(3);
    expect(Result.err<number, string>("e").match((n) => n, () => -1)).toBe(-1);

    const failed = Result.err<number, string>("e");
    expect(failed.map((n) => n * 2).error()).toBe("e");
    expect(failed.andThen((n) => Result.ok<number, string>(n)).error()).toBe("e");
  });

  it("hata üzerinde unwrap / başarı üzerinde error fırlatır", () => {
    expect(() => Result.err<number, string>("e").unwrap()).toThrow();
    expect(() => Result.ok<number, string>(1).error()).toThrow();
  });
});

describe("yerel DomainError taksonomisi", () => {
  it.each([
    [new ValidationError("c", "m"), "validation", false],
    [new NotFoundError("c", "m"), "not_found", false],
    [new UnauthorizedError("c", "m"), "unauthorized", false],
    [new ForbiddenError("c", "m"), "forbidden", false],
    [new ConflictError("c", "m"), "conflict", false],
    [new TransientError("c", "m"), "transient", true],
    [new FatalError("c", "m"), "fatal", false],
  ])("kind/retryable doğru (%#)", (error, kind, retryable) => {
    expect(error).toBeInstanceOf(DomainError);
    expect(error.kind).toBe(kind);
    expect(error.retryable).toBe(retryable);
    expect(error.code).toBe("c");
    expect(error.message).toBe("m");
  });

  it("boş code/message reddedilir", () => {
    expect(() => new ValidationError("", "m")).toThrow();
    expect(() => new ValidationError("c", "")).toThrow();
  });
});
