/**
 * ws-tunnel logger sözleşmesi — JENERİK, minimal.
 *
 * Tünel modülleri yalnızca bu arayüzü bilir; monorepo'da `TamperLogger`
 * yapısal olarak uygular (eventCode serbest string — sözlük doğrulaması
 * tüketicinin eventCodeValidator'ına aittir). Logger verilmezse log çağrıları
 * atlanır (kademeli bozulma).
 */
export interface TunnelLogInput {
  level: "debug" | "info" | "warn" | "error" | "fatal";
  category: "app" | "audit" | "security";
  eventCode: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ILogger {
  log(input: TunnelLogInput): Promise<void>;
}
