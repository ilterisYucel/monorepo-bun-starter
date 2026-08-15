// CircuitBreakerMeta sprite meta: AI çıktısındaki yuva konumları.
// tools/measure-meta.mjs tarafından üretilir (recessed bölge tespiti).
// Değerler gövde boyutlarına ORAN olarak saklanır.
export interface CircuitBreakerMeta {
  measured: boolean;
  displayClosed: { x: number; y: number; width: number; height: number };
  displayOpen: { x: number; y: number; width: number; height: number };
}

export const CIRCUITBREAKER_META: CircuitBreakerMeta = {
  measured: true,
  displayClosed: { x: 0.28750, y: 0.28571, width: 0.48125, height: 0.40476 },
  displayOpen: { x: 0.32500, y: 0.30952, width: 0.45000, height: 0.35714 },
};
