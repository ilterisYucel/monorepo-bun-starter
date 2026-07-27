import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateOrThrow } from "./index";

describe("validateOrThrow", () => {
  const simpleSchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it("returns parsed data on valid input", () => {
    const result = validateOrThrow<{ name: string; age: number }>(
      simpleSchema,
      { name: "test", age: 25 },
      "User",
    );
    expect(result).toEqual({ name: "test", age: 25 });
  });

  it("throws with label in error message on invalid input", () => {
    expect(() =>
      validateOrThrow(simpleSchema, { name: "", age: -1 }, "User"),
    ).toThrow(/User/);
  });

  it("throws with detailed Zod validation errors", () => {
    expect(() =>
      validateOrThrow(simpleSchema, { name: "", age: 0 }, "Config"),
    ).toThrow();
  });

  it("handles nested schema errors", () => {
    const nested = z.object({
      db: z.object({
        host: z.string().min(1),
        port: z.number(),
      }),
    });
    expect(() =>
      validateOrThrow(nested, { db: { host: "", port: "bad" } }, "DB"),
    ).toThrow(/DB/);
  });
});
