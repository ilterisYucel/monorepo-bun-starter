// Ortam ve konteyner termal zonları.
// Konteyner, her biri bir MC90 klimanın beslediği hava zonlarına bölünür; her zonda
// raflar ısı verir, klima soğutur/ısıtır, duvarlardan dış ortamla ısı alışverişi olur.

import { clamp, lag } from "../core/util";

export interface WeatherConfig {
  mode: "sabit" | "gunluk";
  fixedC: number;
  minC: number; // günlük en düşük (05:00)
  maxC: number; // günlük en yüksek (15:00)
  solarW: number; // zon başına öğle güneş kazancı (W)
}

export class Weather {
  cfg: WeatherConfig = { mode: "gunluk", fixedC: 25, minC: 14, maxC: 31, solarW: 600 };
  /** Konsoldan anlık ek (ör. sıcak hava dalgası senaryosu). */
  offsetC = 0;

  /** @param tod günün saati (0..24) */
  outdoorC(tod: number): number {
    if (this.cfg.mode === "sabit") return this.cfg.fixedC + this.offsetC;
    const { minC, maxC } = this.cfg;
    // 05:00 min, 15:00 max — asimetrik kosinüs
    const x = tod < 5 ? tod + 24 : tod;
    const rising = x >= 5 && x < 15;
    const ph = rising ? (x - 5) / 10 : (x - 15) / 14;
    const k = rising ? (1 - Math.cos(Math.PI * ph)) / 2 : (1 + Math.cos(Math.PI * ph)) / 2;
    return minC + (maxC - minC) * k + this.offsetC;
  }
  solar(tod: number): number {
    if (tod < 6.5 || tod > 19) return 0;
    return this.cfg.solarW * Math.sin((Math.PI * (tod - 6.5)) / 12.5);
  }
}

export class ThermalZone {
  airT: number;
  /** Isıl kapasite (J/K): ~30 m³ hava + raf/metal yapı. */
  readonly cap = 380_000;
  /** Dış ortamla iletim (W/K) — yalıtımlı konteyner payı. */
  ua = 28;
  lastHeatW = 0;
  constructor(
    readonly id: string,
    initialT: number,
  ) {
    this.airT = initialT;
  }
  step(dt: number, heatW: number, outdoorC: number, solarW: number): void {
    const q = heatW + solarW + this.ua * (outdoorC - this.airT);
    this.lastHeatW = heatW;
    this.airT = clamp(this.airT + (q * dt) / this.cap, -40, 90);
  }
}

/** Şebeke (OG bağlantı noktası) — PCS'nin gördüğü AC gerilim/frekans. */
export class Grid {
  nominalV = 690;
  vPu = 1.0;
  hz = 50.0;
  /** Konsol: şebeke sapma senaryosu. */
  override: { vPu?: number; hz?: number } = {};
  private noise = 0;
  step(dt: number, rng: () => number): void {
    this.noise = lag(this.noise, (rng() - 0.5) * 0.004, dt, 5);
    const v = this.override.vPu ?? 1.0;
    const f = this.override.hz ?? 50.0;
    this.vPu = v + this.noise;
    this.hz = f + this.noise * 2;
  }
  get vLL(): number {
    return this.nominalV * this.vPu;
  }
}
