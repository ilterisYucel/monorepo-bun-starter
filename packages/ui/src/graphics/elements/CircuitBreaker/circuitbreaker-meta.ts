// CircuitBreakerMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface CircuitBreakerMeta {
  measured: boolean;
  display: { x: number; y: number; width: number; height: number };
}

export const CIRCUITBREAKER_META: CircuitBreakerMeta = {
  measured: true,
  display: { x: 0.24375, y: 0.28571, width: 0.53125, height: 0.40476 },
};
