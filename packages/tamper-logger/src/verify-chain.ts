import type { LogEvent } from "./types";
import { GENESIS_HASH, verifySignature } from "./pipeline";

/** Zincir ihlal nedenleri. */
export type ChainViolationReason =
  | "missing_event"
  | "signature_mismatch"
  | "out_of_order";

/** Tek bir zincir ihlali. */
export interface ChainViolation {
  readonly seq: number;
  readonly reason: ChainViolationReason;
}

/** Zincir doğrulama sonucu. */
export interface ChainVerification {
  readonly valid: boolean;
  readonly events: number;
  readonly segments: number;
  readonly violations: ChainViolation[];
}

/**
 * Dosyadan okunmuş olayların tamper zincirini doğrular.
 *
 * Dosya sırası = zincir sırasıdır (TamperLogger yazımları write zinciriyle
 * serileştirir); sıralama YAPILMAZ — sıralanmış dosya kurcalama işaretidir.
 *
 * - `GENESIS_HASH` prevHash taşıyan olay yeni segment başlatır (servis
 *   restart'ı = per-process zincir — tamper DEĞİL).
 * - prevHash önceki imzayla eşleşiyorsa seq monoton +1 olmalı: atlama
 *   missing_event (silinen satır), gerileme out_of_order.
 * - İmza uyumsuzluğu signature_mismatch.
 */
export function verifyChain(
  events: LogEvent[],
  key: string,
): ChainVerification {
  if (events.length === 0) {
    return { valid: true, events: 0, segments: 0, violations: [] };
  }

  const violations: ChainViolation[] = [];
  let segments = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const previous = i > 0 ? events[i - 1] : undefined;

    if (previous === undefined) {
      if (event.prevHash !== GENESIS_HASH) {
        violations.push({ seq: event.seq, reason: "missing_event" });
      } else {
        segments++;
      }
    } else if (event.prevHash === previous.signature) {
      if (event.seq === previous.seq + 1) {
        // zincir sağlam devam ediyor
      } else if (event.seq <= previous.seq) {
        violations.push({ seq: event.seq, reason: "out_of_order" });
      } else {
        violations.push({ seq: event.seq, reason: "missing_event" });
      }
    } else if (event.prevHash === GENESIS_HASH) {
      segments++;
    } else {
      violations.push({ seq: event.seq, reason: "missing_event" });
    }

    if (!verifySignature(event, key)) {
      violations.push({ seq: event.seq, reason: "signature_mismatch" });
    }
  }

  return {
    valid: violations.length === 0,
    events: events.length,
    segments,
    violations,
  };
}
