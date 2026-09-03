import { describe, it, expect } from "vitest";
import {
  GENESIS_HASH,
  redactValue,
  redactEvent,
  enrichEvent,
  signEvent,
  nextState,
  canonicalize,
  verifySignature,
} from "./pipeline";
import type { SigningState } from "./pipeline";
import type { LogEventInput } from "./types";

/**
 * T0.3 — pipeline kontratı (TESTING.md §8.1):
 *
 * - `redactValue`: context içindeki hassas anahtarların değerleri "[REDACTED]" olur;
 *   eşleşme anahtar adına göre, büyük/küçük harf duyarsız, iç içe nesnelerde.
 * - `enrichEvent`: ts (ISO), service, host, correlationId (yoksa üretilir) doldurulur;
 *   seq/prevHash state'ten gelir; girdide zaten olan alanlar korunur.
 * - `signEvent`: HMAC-SHA256; imza `prevHash + seq + canonical` üzerinden hesaplanır;
 *   aynı zincir + aynı girdi → aynı imza (deterministik).
 * - `nextState`: seq artar, prevHash = önceki imza — zincir.
 * - `verifySignature`: doğru anahtar + bozulmamış event → true; kurcalanmış → false.
 * - `canonicalize`: deterministik serileştirme (anahtar sıralı JSON).
 */

const KEY = "test-signing-key";
const INITIAL: SigningState = { seq: 1, prevHash: GENESIS_HASH };

function baseInput(): LogEventInput {
  return {
    level: "info",
    category: "app",
    eventCode: "service_started",
    message: "servis başladı",
    context: { deviceId: "bsc-1" },
    correlationId: "corr-1",
  };
}

describe("pipeline (T0.3)", () => {
  describe("redactValue", () => {
    it("hassas anahtar değerini REDACTED yapar", () => {
      const out = redactValue(
        { password: "s3cret", name: "x" },
        ["password", "token", "authorization"],
      );
      expect(out).toEqual({ password: "[REDACTED]", name: "x" });
    });

    it("büyük/küçük harf duyarsız eşleşir", () => {
      const out = redactValue({ Authorization: "Bearer abc" }, ["authorization"]);
      expect(out).toEqual({ Authorization: "[REDACTED]" });
    });

    it("iç içe nesnelerde de redakte eder", () => {
      const out = redactValue(
        { nested: { token: "t", deep: { apiKey: "k" } } },
        ["token", "api_key", "apikey"],
      );
      expect(out).toEqual({
        nested: { token: "[REDACTED]", deep: { apiKey: "[REDACTED]" } },
      });
    });

    it("dizilerdeki nesneleri de redakte eder", () => {
      const out = redactValue([{ secret: "s" }, { ok: 1 }], ["secret"]);
      expect(out).toEqual([{ secret: "[REDACTED]" }, { ok: 1 }]);
    });

    it("anahtar adı kısmi içeriyorsa eşleşir (api_key, apiKey)", () => {
      const out = redactValue({ xApiKeyY: "k" }, ["apikey"]);
      expect(out).toEqual({ xApiKeyY: "[REDACTED]" });
    });

    it("hassas olmayan değerler dokunulmaz", () => {
      const out = redactValue({ deviceId: "bsc-1", voltage: 220 }, []);
      expect(out).toEqual({ deviceId: "bsc-1", voltage: 220 });
    });

    it("ilkel değerler aynen döner", () => {
      expect(redactValue(42, ["token"])).toBe(42);
      expect(redactValue("str", ["token"])).toBe("str");
      expect(redactValue(null, ["token"])).toBeNull();
    });
  });

  describe("redactEvent", () => {
    it("context'i redakte eder, diğer alanları korur", () => {
      const input = baseInput();
      const out = redactEvent(input, ["password"]);
      expect(out.context).toEqual({ deviceId: "bsc-1" });
      expect(out.eventCode).toBe("service_started");
      expect(out).not.toBe(input);
    });

    it("context yoksa dokunmadan döner", () => {
      const input = { ...baseInput(), context: undefined };
      const out = redactEvent(input, ["password"]);
      expect(out.context).toBeUndefined();
      expect(out.message).toBe(input.message);
    });
  });

  describe("enrichEvent", () => {
    it("eksik alanları doldurur", () => {
      const out = enrichEvent(
        { level: "error", category: "app", eventCode: "modbus_read_failed", message: "timeout" },
        INITIAL,
        "device-service",
        "revpi-1",
        () => "corr-2",
      );
      expect(out.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(out.service).toBe("device-service");
      expect(out.host).toBe("revpi-1");
      expect(out.correlationId).toBe("corr-2");
      expect(out.seq).toBe(1);
      expect(out.prevHash).toBe(GENESIS_HASH);
    });

    it("girdideki değerleri ezmez", () => {
      const out = enrichEvent(baseInput(), INITIAL, "svc", "host", () => "x");
      expect(out.correlationId).toBe("corr-1");
    });

    it("ts girdide varsa korunur", () => {
      const out = enrichEvent(
        { ...baseInput(), ts: "2026-08-24T10:00:00.000Z" },
        INITIAL,
        "svc",
        "host",
        () => "x",
      );
      expect(out.ts).toBe("2026-08-24T10:00:00.000Z");
    });
  });

  describe("signEvent + nextState + verifySignature", () => {
    function signedFirst() {
      const enriched = enrichEvent(
        { ...baseInput(), ts: "2026-08-24T10:00:00.000Z" },
        INITIAL,
        "svc",
        "host",
        () => "c",
      );
      return signEvent(enriched, KEY);
    }

    it("signature 64 hex karakterdir", () => {
      const ev = signedFirst();
      expect(ev.signature).toMatch(/^[0-9a-f]{64}$/);
    });

    it("deterministik — aynı zincir + girdi = aynı imza", () => {
      expect(signedFirst().signature).toBe(signedFirst().signature);
    });

    it("nextState zinciri ilerletir", () => {
      const first = signedFirst();
      const state2 = nextState(INITIAL, first.signature);
      expect(state2.seq).toBe(2);
      expect(state2.prevHash).toBe(first.signature);
    });

    it("ikinci olayın prevHash'i ilk imzadır (zincir)", () => {
      const first = signedFirst();
      const state2 = nextState(INITIAL, first.signature);
      const second = signEvent(
        enrichEvent(baseInput(), state2, "svc", "host", () => "c"),
        KEY,
      );
      expect(second.prevHash).toBe(first.signature);
      expect(second.seq).toBe(2);
    });

    it("verifySignature geçerli event'i kabul eder", () => {
      expect(verifySignature(signedFirst(), KEY)).toBe(true);
    });

    it("verifySignature kurcalanmış message'ı reddeder", () => {
      const ev = signedFirst();
      const tampered = { ...ev, message: "değiştirildi" };
      expect(verifySignature(tampered, KEY)).toBe(false);
    });

    it("verifySignature yanlış anahtarı reddeder", () => {
      expect(verifySignature(signedFirst(), "other-key")).toBe(false);
    });

    it("verifySignature kurcalanmış seq'i reddeder", () => {
      const ev = signedFirst();
      expect(verifySignature({ ...ev, seq: 99 }, KEY)).toBe(false);
    });
  });

  describe("canonicalize", () => {
    it("context anahtar sırasından bağımsızdır", () => {
      const a = canonicalize({
        ...baseInput(),
        ts: "t",
        seq: 1,
        prevHash: GENESIS_HASH,
        signature: "x",
        context: { b: 2, a: 1 },
      } as never);
      const b = canonicalize({
        ...baseInput(),
        ts: "t",
        seq: 1,
        prevHash: GENESIS_HASH,
        signature: "x",
        context: { a: 1, b: 2 },
      } as never);
      expect(a).toBe(b);
    });

    it("dizi içeren context'i serileştirir", () => {
      const out = canonicalize({
        ...baseInput(),
        ts: "t",
        seq: 1,
        prevHash: GENESIS_HASH,
        signature: "x",
        context: { tags: ["a", "b"] },
      } as never);
      expect(out).toContain('"tags":["a","b"]');
    });
  });
});
