// Ortak yardımcılar — sayısal kodlama, enterpolasyon, deterministik rastgele.

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Parçalı doğrusal enterpolasyon (xs artan). Uçlarda sabit tutar. */
export function interp(x: number, xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (x <= xs[0]!) return ys[0]!;
  if (x >= xs[n - 1]!) return ys[n - 1]!;
  for (let i = 0; i < n - 1; i++) {
    const x1 = xs[i]!;
    const x2 = xs[i + 1]!;
    if (x >= x1 && x <= x2) {
      const t = x2 === x1 ? 0 : (x - x1) / (x2 - x1);
      return ys[i]! + t * (ys[i + 1]! - ys[i]!);
    }
  }
  return ys[n - 1]!;
}

/** İşaretli değeri 16 bit ham kelimeye çevirir (two's complement). */
export const s16 = (v: number): number => {
  const r = Math.round(v);
  const c = clamp(r, -32768, 32767);
  return c < 0 ? (c + 0x10000) & 0xffff : c & 0xffff;
};
/** İşaretsiz 16 bit (taşmayı keser). */
export const u16 = (v: number): number => clamp(Math.round(v), 0, 0xffff);
/** Ham 16 bit kelime → işaretli. */
export const toSigned16 = (w: number): number => (w >= 0x8000 ? w - 0x10000 : w);

/** 32 bit → [yüksek, düşük] kelime (big-endian kelime sırası). */
export function u32words(v: number): [number, number] {
  const x = clamp(Math.round(v), 0, 0xffffffff) >>> 0;
  return [(x >>> 16) & 0xffff, x & 0xffff];
}
export function s32words(v: number): [number, number] {
  let x = Math.round(v);
  x = clamp(x, -0x80000000, 0x7fffffff);
  const u = x < 0 ? (x + 0x100000000) >>> 0 : x >>> 0;
  return [(u >>> 16) & 0xffff, u & 0xffff];
}
export function f32words(v: number): [number, number] {
  const b = new DataView(new ArrayBuffer(4));
  b.setFloat32(0, v, false);
  return [b.getUint16(0), b.getUint16(2)];
}

/** Bit set/clear. */
export const bit = (word: number, n: number, on: boolean): number => (on ? word | (1 << n) : word & ~(1 << n)) & 0xffff;
export const hasBit = (word: number, n: number): boolean => ((word >> n) & 1) === 1;

/** Deterministik PRNG (mulberry32) — tekrarlanabilir senaryolar için. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Normal dağılım (Box-Muller) üreteci. */
export function gauss(rng: () => number): number {
  const u = Math.max(1e-12, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Birinci mertebe gecikme: x → hedef, zaman sabiti tau (s). */
export const lag = (x: number, target: number, dt: number, tau: number): number =>
  tau <= 0 ? target : x + (target - x) * (1 - Math.exp(-dt / tau));

/** Rampa: x → hedef, maksimum hız rate (birim/s). */
export function ramp(x: number, target: number, dt: number, rate: number): number {
  const d = target - x;
  const step = rate * dt;
  if (Math.abs(d) <= step) return target;
  return x + Math.sign(d) * step;
}

export const fmt = (v: number, d = 1): string => (Number.isFinite(v) ? v.toFixed(d) : "—");
