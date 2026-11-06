// Teşhis motoru — LGES "Diagnosis_GDE_JF1 1CP Turkey Rack System v1.1.0" eşikleri.
// Her teşhis: algılama koşulu + süre, bırakma koşulu + süre (yoksa kilitli),
// temizleme yolu (auto / Event Clear / Reset / yalnız LGES) ve aksiyon.
// Register yerleşimi: Flex BSC Modbus Map Rev AF — her diag register'ı 4 grup × 4 bit
// (grupta üstten: Fault2, Fault1, Warning, Alarm).

export type DiagLevel = "alarm" | "warning" | "fault1" | "fault2";
export type DiagAction =
  | "none"
  | "derate-chg" // şarj limitinden raf düşülür
  | "derate-dis"
  | "derate-both"
  | "open" // raf MC açılır (+ limitten düşülür)
  | "section-zero-chg"
  | "section-zero-dis"
  | "section-zero" // bölüm limitleri 0
  | "section-open" // bölüm limitleri 0 + tüm raflar açılır
  | "emergency"; // BSC Emergency moduna geçer
export type ClearBy = "auto" | "eventclear" | "reset" | "lges";

export interface DiagDef<C> {
  code: string;
  name: string;
  level: DiagLevel;
  /** Register: raf için summary ofseti (18..32, 80=BSC-by-BSC), bölüm için mutlak adres. */
  reg: number;
  bit: number;
  detectS: number;
  releaseS?: number;
  detect: (c: C) => boolean;
  /** Tanımlıysa otomatik bırakma koşulu (histerezis). Yoksa kilitli (clearBy). */
  release?: (c: C) => boolean;
  clearBy: ClearBy;
  action: DiagAction;
}

export interface DiagStatus {
  code: string;
  name: string;
  level: DiagLevel;
  reg: number;
  bit: number;
  active: boolean;
  since: number;
}

interface DiagRuntime {
  onTimer: number;
  offTimer: number;
  active: boolean;
  since: number;
}

/** Bir kapsam (raf veya bölüm) için teşhis değerlendirici. */
export class DiagEngine<C> {
  private readonly rt = new Map<string, DiagRuntime>();
  /** Enjeksiyonla zorlanan teşhisler (arıza konsolu). */
  readonly forced = new Set<string>();

  constructor(
    readonly defs: readonly DiagDef<C>[],
    private readonly onChange: (d: DiagDef<C>, active: boolean) => void,
  ) {
    for (const d of defs) this.rt.set(d.code, { onTimer: 0, offTimer: 0, active: false, since: 0 });
  }

  /** Koşulları dt (s) kadar değerlendirir. `enabled=false` iken yalnız kilitli olanlar korunur. */
  evaluate(ctx: C, dt: number, simT: number, enabled = true): void {
    for (const d of this.defs) {
      const r = this.rt.get(d.code)!;
      const forced = this.forced.has(d.code);
      const cond = forced || (enabled && safe(() => d.detect(ctx)));
      if (!r.active) {
        r.onTimer = cond ? r.onTimer + dt : 0;
        if (cond && (forced || r.onTimer >= d.detectS)) {
          r.active = true;
          r.since = simT;
          r.offTimer = 0;
          this.onChange(d, true);
        }
      } else if (d.clearBy === "auto" || d.release) {
        if (forced) {
          r.offTimer = 0;
          continue;
        }
        const rel = d.release ? enabled && safe(() => d.release!(ctx)) : !cond;
        r.offTimer = rel ? r.offTimer + dt : 0;
        if (rel && r.offTimer >= (d.releaseS ?? 0) && d.clearBy === "auto") {
          r.active = false;
          r.onTimer = 0;
          this.onChange(d, false);
        }
      }
    }
  }

  /** Event Clear / Reset — temizlenebilir kilitli teşhisleri bırakır. */
  clear(by: "eventclear" | "reset"): number {
    let n = 0;
    for (const d of this.defs) {
      const r = this.rt.get(d.code)!;
      if (!r.active) continue;
      const ok =
        d.clearBy === "auto" ||
        (by === "eventclear" && d.clearBy === "eventclear") ||
        (by === "reset" && (d.clearBy === "eventclear" || d.clearBy === "reset"));
      if (ok && !this.forced.has(d.code)) {
        r.active = false;
        r.onTimer = 0;
        r.offTimer = 0;
        this.onChange(d, false);
        n++;
      }
    }
    return n;
  }

  /** LGES personeli temizliği (CER dahil) — yalnız konsoldan. */
  clearAll(): void {
    this.forced.clear();
    for (const d of this.defs) {
      const r = this.rt.get(d.code)!;
      if (r.active) {
        r.active = false;
        this.onChange(d, false);
      }
      r.onTimer = 0;
      r.offTimer = 0;
    }
  }

  isActive(code: string): boolean {
    return this.rt.get(code)?.active ?? false;
  }

  active(): DiagDef<C>[] {
    return this.defs.filter((d) => this.rt.get(d.code)!.active);
  }

  anyLevel(level: DiagLevel | DiagLevel[]): boolean {
    const ls = Array.isArray(level) ? level : [level];
    return this.active().some((d) => ls.includes(d.level));
  }

  hasAction(...actions: DiagAction[]): boolean {
    return this.active().some((d) => actions.includes(d.action));
  }

  /** Register kelimesi (verilen reg için aktif bitlerin OR'u). */
  word(reg: number): number {
    let w = 0;
    for (const d of this.defs) if (d.reg === reg && this.rt.get(d.code)!.active) w |= 1 << d.bit;
    return w & 0xffff;
  }

  status(): DiagStatus[] {
    return this.defs.map((d) => {
      const r = this.rt.get(d.code)!;
      return { code: d.code, name: d.name, level: d.level, reg: d.reg, bit: d.bit, active: r.active, since: r.since };
    });
  }
}

function safe(f: () => boolean): boolean {
  try {
    return f();
  } catch {
    return false;
  }
}

/** Grup içi bit: grup 0 = b15..b12, 1 = b11..b8, 2 = b7..b4, 3 = b3..b0. */
export function gbit(group: 0 | 1 | 2 | 3, level: DiagLevel): number {
  const base = (3 - group) * 4;
  const off = level === "alarm" ? 0 : level === "warning" ? 1 : level === "fault1" ? 2 : 3;
  return base + off;
}
