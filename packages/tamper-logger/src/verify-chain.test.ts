import { describe, it, expect } from "vitest";
import { GENESIS_HASH, enrichEvent, signEvent, nextState } from "./pipeline";
import type { SigningState } from "./pipeline";
import { verifyChain } from "./verify-chain";
import type { LogEvent, LogEventInput } from "./types";

/**
 * T0.9 — verifyChain kontratı (TESTING.md §8.1; tasarım Faz 0 T0.9):
 *
 * - Girdi: dosyadan okunmuş LogEvent'ler + imza anahtarı.
 * - Olaylar seq'e göre sıralanır (yazım sırası zincir sırasından sapabilir).
 * - Zincir: ilk olay prevHash=GENESIS; sonrakiler prevHash=önceki imza.
 * - Restart segmentleri: zincir koptuğunda yeni olay GENESIS prevHash taşıyorsa
 *   yeni segment başlar (per-process zincir — tamper DEĞİL).
 * - İhlaller: missing_event (silinen satır), signature_mismatch (kurcalama),
 *   out_of_order (yinelenen seq).
 * - valid = ihlal yok; boş liste geçerlidir.
 */

const KEY = "verify-key";
const HOST = "h";
const SVC = "svc";

function input(eventCode: LogEventInput["eventCode"]): LogEventInput {
  return {
    level: "info",
    category: "app",
    eventCode,
    message: "x",
    context: {},
    correlationId: "c",
  };
}

function buildChain(count: number, startState: SigningState = { seq: 1, prevHash: GENESIS_HASH }): { events: LogEvent[]; endState: SigningState } {
  const events: LogEvent[] = [];
  let state = startState;
  for (let i = 0; i < count; i++) {
    const signed = signEvent(enrichEvent(input("service_started"), state, SVC, HOST, () => "c"), KEY);
    events.push(signed);
    state = nextState(state, signed.signature);
  }
  return { events, endState: state };
}

describe("verifyChain (T0.9) @nis2-security", () => {
  it("boş liste geçerlidir (0 olay, 0 segment)", () => {
    const v = verifyChain([], KEY);
    expect(v.valid).toBe(true);
    expect(v.events).toBe(0);
    expect(v.segments).toBe(0);
  });

  it("tek genesis olayı geçerlidir", () => {
    const { events } = buildChain(1);
    const v = verifyChain(events, KEY);
    expect(v.valid).toBe(true);
    expect(v.events).toBe(1);
    expect(v.segments).toBe(1);
  });

  it("3 olaylık zincir geçerlidir", () => {
    const { events } = buildChain(3);
    const v = verifyChain(events, KEY);
    expect(v.valid).toBe(true);
    expect(v.events).toBe(3);
    expect(v.segments).toBe(1);
  });

  it("aradan olay silinirse missing_event tespit edilir", () => {
    const { events } = buildChain(3);
    const missing = [events[0], events[2]];
    const v = verifyChain(missing, KEY);
    expect(v.valid).toBe(false);
    expect(v.violations).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: "missing_event" })]),
    );
  });

  it("kurcalanmış içerik signature_mismatch üretir", () => {
    const { events } = buildChain(2);
    const tampered = [{ ...events[0], message: "değiştirildi" }, events[1]];
    const v = verifyChain(tampered, KEY);
    expect(v.valid).toBe(false);
    expect(v.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "signature_mismatch" }),
      ]),
    );
  });

  it("yanlış anahtar signature_mismatch üretir", () => {
    const { events } = buildChain(1);
    const v = verifyChain(events, "wrong-key");
    expect(v.valid).toBe(false);
  });

  it("restart segmenti (yeni genesis zinciri) geçerlidir — 2 segment", () => {
    const first = buildChain(2);
    const second = buildChain(2);
    const v = verifyChain([...first.events, ...second.events], KEY);
    expect(v.valid).toBe(true);
    expect(v.segments).toBe(2);
    expect(v.events).toBe(4);
  });

  it("karışık dosya sırası missing_event üretir (write zinciri sırayı garanti eder)", () => {
    const { events } = buildChain(3);
    const shuffled = [events[2], events[0], events[1]];
    const v = verifyChain(shuffled, KEY);
    expect(v.valid).toBe(false);
    expect(v.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "missing_event" }),
      ]),
    );
  });

  it("seq atlaması (silinen satır, eşleşen hash) missing_event üretir", () => {
    const { events } = buildChain(3);
    const skipped = [events[0], events[2]];
    expect(events[2].prevHash).toBe(events[1].signature);
    const v = verifyChain(skipped, KEY);
    expect(v.valid).toBe(false);
    expect(v.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ seq: 3, reason: "missing_event" }),
      ]),
    );
  });

  it("yinelenen seq out_of_order ihlali üretir", () => {
    const { events } = buildChain(1);
    // e1: seq=1, prevHash=GENESIS. Sahte olay: zincir devam ediyor gibi görünür
    // ama seq ilerlemez (1 → 1) — out_of_order.
    const forged = signEvent(
      enrichEvent(
        input("service_started"),
        { seq: 1, prevHash: events[0].signature },
        SVC,
        HOST,
        () => "c",
      ),
      KEY,
    );
    const v = verifyChain([...events, forged], KEY);
    expect(v.valid).toBe(false);
    expect(v.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "out_of_order" }),
      ]),
    );
  });

  it("başlangıç prevHash'i genesis değilse missing_event üretir", () => {
    const { events } = buildChain(2);
    const headless = [events[1]];
    const v = verifyChain(headless, KEY);
    expect(v.valid).toBe(false);
    expect(v.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "missing_event" }),
      ]),
    );
  });
});
