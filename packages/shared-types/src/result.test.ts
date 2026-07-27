import { describe, it, expect } from "vitest";
import { Result } from "./result";

describe("Result", () => {
  describe("ok()", () => {
    it("creates a success result with the value", () => {
      const r = Result.ok(42);
      expect(r.isSuccess).toBe(true);
      expect(r.isFailure).toBe(false);
      expect(r.value).toBe(42);
      expect(r.error).toBeUndefined();
    });

    it("preserves generic type", () => {
      const r = Result.ok<string>("hello");
      expect(r.value).toBe("hello");
    });

    it("handles object values", () => {
      const r = Result.ok({ a: 1, b: "x" });
      expect(r.value).toEqual({ a: 1, b: "x" });
    });

    it("handles undefined value", () => {
      const r = Result.ok<undefined>(undefined);
      expect(r.isSuccess).toBe(true);
      expect(r.value).toBeUndefined();
    });

    it("handles null value", () => {
      const r = Result.ok<null>(null);
      expect(r.isSuccess).toBe(true);
      expect(r.value).toBeNull();
    });
  });

  describe("fail()", () => {
    it("creates a failure result with error message", () => {
      const r = Result.fail("something went wrong");
      expect(r.isSuccess).toBe(false);
      expect(r.isFailure).toBe(true);
      expect(r.error).toBe("something went wrong");
      expect(r.value).toBeUndefined();
    });

    it("creates failure with different error messages", () => {
      const r = Result.fail("Invalid input: name is required");
      expect(r.error).toBe("Invalid input: name is required");
      expect(r.isFailure).toBe(true);
    });

    it("has undefined value on failure", () => {
      const r = Result.fail<number>("nope");
      expect(r.value).toBeUndefined();
    });
  });

  describe("isFailure", () => {
    it("returns true for failed result", () => {
      expect(Result.fail("err").isFailure).toBe(true);
    });

    it("returns false for success result", () => {
      expect(Result.ok(1).isFailure).toBe(false);
    });
  });

  describe("immutability pattern", () => {
    it("readonly properties create new Result each time", () => {
      const r1 = Result.ok(1);
      const r2 = Result.ok(1);
      expect(r1).not.toBe(r2);
      expect(r1.value).toBe(r2.value);
    });
  });
});
