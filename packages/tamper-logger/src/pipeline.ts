import { createHmac } from "node:crypto";
import type { LogEvent, LogEventInput } from "./types";

/** Zincirin başlangıç hash'i — ilk olayın prevHash değeri. */
export const GENESIS_HASH = "0".repeat(64);

/** İmza zinciri durumu — immutable; ilerleme yeni örnek üretir. */
export interface SigningState {
  readonly seq: number;
  readonly prevHash: string;
}

/** Zenginleştirilmiş ama henüz imzalanmamış olay — signEvent girdisi. */
export type EnrichedEvent = Omit<LogEvent, "signature">;

/**
 * Değeri derinlemesine redakte eder: anahtar adı redaction anahtarlarından
 * herhangi birini içeriyorsa (büyük/küçük harf duyarsız, kısmi eşleşme)
 * değer "[REDACTED]" olur. Dizi ve iç içe nesnelerde çalışır.
 */
export function redactValue(value: unknown, redactionKeys: string[]): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, redactionKeys));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const sensitive = redactionKeys.some((rk) =>
        key.toLowerCase().includes(rk.toLowerCase()),
      );
      out[key] = sensitive ? "[REDACTED]" : redactValue(item, redactionKeys);
    }
    return out;
  }
  return value;
}

/** Olay girdisinin context'ini redakte eder — diğer alanlar korunur. */
export function redactEvent(
  input: LogEventInput,
  redactionKeys: string[],
): LogEventInput {
  const out: LogEventInput = { ...input };
  if (input.context !== undefined) {
    out.context = redactValue(input.context, redactionKeys) as Record<
      string,
      unknown
    >;
  }
  return out;
}

/**
 * Eksik alanları doldurur: ts (yoksa şimdi), service, host, correlationId
 * (yoksa üretilir) ve zincir state'inden seq/prevHash.
 */
export function enrichEvent(
  input: LogEventInput,
  state: SigningState,
  service: string,
  host: string,
  correlationIdFactory: () => string,
): EnrichedEvent {
  return {
    ...input,
    ts: input.ts ?? new Date().toISOString(),
    service: input.service ?? service,
    host: input.host ?? host,
    correlationId: input.correlationId ?? correlationIdFactory(),
    seq: state.seq,
    prevHash: state.prevHash,
  };
}

/** Anahtar sırasından bağımsız deterministik serileştirme (anahtarlar sıralı). */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item));
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/** Deterministik canonical gösterim — imza girdisi. */
export function canonicalize(event: LogEvent): string {
  const context =
    event.context !== undefined
      ? JSON.stringify(sortKeys(event.context))
      : "{}";
  return [
    event.ts,
    event.level,
    event.category,
    event.eventCode,
    event.message,
    context,
    event.correlationId ?? "",
    event.service ?? "",
    event.host ?? "",
    event.signature,
  ].join("\n");
}

/** HMAC-SHA256 ile olayı imzalar — girdi: prevHash + seq + canonical. */
export function signEvent(enriched: EnrichedEvent, key: string): LogEvent {
  const unsigned: LogEvent = { ...enriched, signature: "" };
  const signature = createHmac("sha256", key)
    .update(`${enriched.prevHash}\n${enriched.seq}\n${canonicalize(unsigned)}`)
    .digest("hex");
  return { ...enriched, signature };
}

/** Zinciri ilerletir — seq artar, prevHash önceki imza olur. */
export function nextState(state: SigningState, signature: string): SigningState {
  return { seq: state.seq + 1, prevHash: signature };
}

/** İmzanın anahtarla ve olay içeriğiyle uyumlu olup olmadığını doğrular. */
export function verifySignature(event: LogEvent, key: string): boolean {
  const unsigned: LogEvent = { ...event, signature: "" };
  const expected = createHmac("sha256", key)
    .update(`${event.prevHash}\n${event.seq}\n${canonicalize(unsigned)}`)
    .digest("hex");
  return expected === event.signature;
}
