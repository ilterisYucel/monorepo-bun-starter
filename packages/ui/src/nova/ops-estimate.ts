/**
 * Operations formu için saf hesaplar (referans konsol `fl02Estimate` / `branchSplit` karşılığı).
 *
 * Backend sözleşmesi DEĞİŞMEZ: buradaki tahmin yalnız kullanıcıya "ne olacak" gösterir
 * (frontend hesabı). Gerçek yürütme executor'ın `divideTotal` bölüşümüyle yapılır.
 */

export interface OpsEstimateUnit {
  n: number;
  soc: number;
  available: boolean;
}

export interface OpsEstimateInput {
  /** Seçili (kapsam) üniteler. */
  units: OpsEstimateUnit[];
  /** Ünite başına PCS sayısı (demo: 2). */
  pcsPerUnit: number;
  /** İstenen toplam Σ PCS gücü (MW). */
  powerMW: number;
  dir: "chg" | "dis";
  /** Hedef SOC (%) — boş/undefined = tam şarj/deşarj (limit). */
  targetSoc?: number;
  socMin: number;
  socMax: number;
  /** Bir ünitenin (konteynerin) kullanılabilir enerjisi (MWh). */
  unitMWh: number;
  /** Gidiş/dönüş verimi (varsayılan 0.975). */
  efficiency?: number;
}

export interface OpsEstimate {
  /** Seçili ünitelerin toplam PCS sayısı. */
  pcs: number;
  /** PCS başına güç (MW). */
  eachMW: number;
  /** Hedefe ulaşma süresi (saat); güç 0 ise 0. */
  durationH: number;
  /** Σ PCS enerjisi (MWh). */
  energyMWh: number;
  /** Seçili ünitelerin ortalama SOC'u (şimdi). */
  socNow: number;
  /** Tahmini ortalama SOC (sonra). */
  socAfter: number;
  /** Uygulanan hedef SOC (limit dahil). */
  target: number;
  /** Bazı üniteler hedefe varmadan SOC limitine dayanıyor. */
  limitHit: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/**
 * Sorgu — FL-02 programının beklenen sonucu (süre, enerji, SOC önce/sonra).
 *
 * Bölüşüm: Σ MW / hazır PCS (eşit). Ünite kapasitesi `unitMWh`; SOC değişim hızı
 * güç/kapasite ile orantılı, verim yönlü uygulanır (şarj: ×η, deşarj: ÷η).
 * Seçili ünite yoksa veya güç 0 ise süre 0.
 */
export function estimateProgram(input: OpsEstimateInput): OpsEstimate {
  const eta = input.efficiency ?? 0.975;
  const selected = input.units.filter((u) => u.available);
  const pcs = selected.length * input.pcsPerUnit;
  const eachMW = pcs > 0 ? input.powerMW / pcs : 0;
  const sign = input.dir === "chg" ? 1 : -1;
  const limit = input.dir === "chg" ? input.socMax : input.socMin;
  const target = clamp(input.targetSoc ?? limit, input.socMin, input.socMax);

  const rows = selected.map((u) => {
    const perUnitMW = eachMW * input.pcsPerUnit;
    const rate = input.unitMWh > 0 ? ((perUnitMW / input.unitMWh) * 100 * (input.dir === "chg" ? eta : 1 / eta)) : 0;
    const hoursTo = rate > 0 ? Math.max(0, (target - u.soc) * sign) / rate : Number.POSITIVE_INFINITY;
    const hoursLimit = rate > 0 ? Math.max(0, (limit - u.soc) * sign) / rate : Number.POSITIVE_INFINITY;
    return { soc: u.soc, rate, hoursTo, hoursLimit };
  });

  const finite = rows.map((r) => r.hoursTo).filter((h) => Number.isFinite(h));
  const durationH = finite.length > 0 ? Math.max(...finite) : 0;
  const limitHit = rows.some((r) => Number.isFinite(r.hoursLimit) && r.hoursLimit < durationH - 1e-9);
  const after = rows.map((r) => clamp(r.soc + sign * r.rate * Math.min(durationH, r.hoursLimit), input.socMin, input.socMax));

  return {
    pcs,
    eachMW,
    durationH,
    energyMWh: input.powerMW * durationH,
    socNow: mean(selected.map((u) => u.soc)),
    socAfter: mean(after),
    target,
    limitHit,
  };
}

export interface OpsFeederGroup {
  /** Topoloji anahtarı ("A" / "B"). */
  key: string;
  /** MV hücre adı ("H04"). */
  cell: string;
  units: number[];
}

/** Sorgu — topoloji fiderlerini seçim satırlarına çevirir (Operations › Groups). */
export function feederGroups(feeders: Record<string, { cell: string; units: number[] }>): OpsFeederGroup[] {
  return Object.entries(feeders).map(([key, f]) => ({ key, cell: f.cell, units: [...f.units] }));
}

/** Sorgu — süreyi "1 h 24 min" biçiminde yazar (referans `durTxt`). */
export function durationText(hours: number): string {
  if (!Number.isFinite(hours)) return "—";
  if (hours <= 0) return "0 h 00 min";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

export interface OpsReactiveInput {
  /** PCS başına aktif güç (MW). */
  eachMW: number;
  /** Seçili PCS sayısı. */
  pcs: number;
  mode: "none" | "q" | "pf";
  /** mode = "q" için toplam MVAr (işaretsiz). */
  qMvar?: number;
  qSide?: "cap" | "ind";
  /** mode = "pf" için 0.01–1. */
  pf?: number;
  pfSide?: "lag" | "lead";
  /** PCS görünür güç limiti (MVA). */
  pcsMaxMVA: number;
  /** Bağlantı noktası gücü (MW) — TEİAŞ P–Q pu hesabı. */
  connMW: number;
  /** 0 = proportional, 1 = P first, 2 = Q first. */
  priority?: 0 | 1 | 2;
}

export interface OpsReactiveResult {
  pEachMW: number;
  qEachMvar: number;
  sEachMVA: number;
  pTotMW: number;
  qTotMvar: number;
  sTotMVA: number;
  pf: number;
  /** TEİAŞ BU Art. 11 P–Q alanı içinde mi (pu). */
  teiasOk: boolean;
  pPpu: number;
  qPpu: number;
  /** İstenen S, PCS limitini aştı → kısıtlama uygulandı. */
  limited: boolean;
}

/**
 * Sorgu — reaktif güç dağıtımı + TEİAŞ P–Q kontrolü (referans `rqCalc` portu).
 *
 * `mode = "q"` → toplam MVAr PCS'lere eşit bölünür; `mode = "pf"` → her PCS'te
 * aynı PF. İstenen S, `pcsMaxMVA`'yı aşarsa `priority` ile kısıtlanır.
 * P–Q kontrolü pu cinsindendir: |P|>0.1 → |Q| ≤ 0.4, aksi hâlde |Q| ≤ 1.
 */
export function reactivePlan(input: OpsReactiveInput): OpsReactiveResult {
  const n = Math.max(1, input.pcs);
  const pEach = input.eachMW;
  let qEach = 0;
  if (input.mode === "q") {
    qEach = ((input.qSide === "ind" ? -1 : 1) * Math.abs(input.qMvar ?? 0)) / n;
  } else if (input.mode === "pf") {
    const pf = Math.min(1, Math.max(0.01, input.pf ?? 1));
    qEach = (input.pfSide === "lag" ? 1 : -1) * pEach * Math.tan(Math.acos(pf));
  }

  let pA = pEach;
  let qA = qEach;
  const sReq = Math.hypot(pEach, qEach);
  let limited = false;
  if (sReq > input.pcsMaxMVA + 1e-9) {
    limited = true;
    if (input.priority === 1) qA = Math.sign(qEach) * Math.sqrt(Math.max(0, input.pcsMaxMVA ** 2 - pEach ** 2));
    else if (input.priority === 2) {
      qA = Math.sign(qEach) * Math.min(Math.abs(qEach), input.pcsMaxMVA);
      pA = Math.sqrt(Math.max(0, input.pcsMaxMVA ** 2 - qA ** 2));
    } else {
      const k = input.pcsMaxMVA / sReq;
      pA = pEach * k;
      qA = qEach * k;
    }
  }

  const pTot = pA * n;
  const qTot = qA * n;
  const sTot = Math.hypot(pTot, qTot);
  const pPpu = pTot / Math.max(1, input.connMW);
  const qPpu = qTot / Math.max(1, input.connMW);
  const teiasOk = Math.abs(pPpu) > 0.1 ? Math.abs(qPpu) <= 0.4 + 1e-9 : Math.abs(qPpu) <= 1 + 1e-9;

  return {
    pEachMW: pA,
    qEachMvar: qA,
    sEachMVA: Math.hypot(pA, qA),
    pTotMW: pTot,
    qTotMvar: qTot,
    sTotMVA: sTot,
    pf: sTot > 0 ? pTot / sTot : 1,
    teiasOk,
    pPpu,
    qPpu,
    limited,
  };
}

export interface OpsSchedule {
  /** Hedef başlangıç (ms). */
  startAt: number;
  /** Hesaplanan bitiş (ms) — stop koşulu "time" ise. */
  endAt: number;
  /** Başlangıç gelecekte mi (veya "now"). */
  startOk: boolean;
  /** Bitiş başlangıçtan sonra mı. */
  endOk: boolean;
}

/**
 * Sorgu — FL-02 zaman planı (referans `fl02Times` portu).
 *
 * `startMode = "now"` → `now`; `"at"` → bugünün 00:00'ı + gün*24s + saat.
 * `endMode = "time"` → aynı formül; aksi hâlde `startAt`.
 */
export function planTimes(input: {
  now: number;
  startMode: "now" | "at";
  startDay?: number;
  startTime?: string;
  endMode: "soc" | "time" | "energy";
  endDay?: number;
  endTime?: string;
}): OpsSchedule {
  const DAY = 86_400_000;
  const tod = (v?: string): number => {
    const [h, m] = String(v ?? "0:0").split(":").map(Number);
    return ((h ?? 0) * 3600 + (m ?? 0) * 60) * 1000;
  };
  const day0 = Math.floor(input.now / DAY) * DAY;
  const startAt =
    input.startMode === "now" ? input.now : day0 + (input.startDay ?? 0) * DAY + tod(input.startTime);
  const endAt =
    input.endMode === "time" ? day0 + (input.endDay ?? 0) * DAY + tod(input.endTime) : startAt;
  return {
    startAt,
    endAt,
    startOk: input.startMode === "now" || startAt > input.now + 30_000,
    endOk: input.endMode !== "time" || endAt > startAt + 60_000,
  };
}
