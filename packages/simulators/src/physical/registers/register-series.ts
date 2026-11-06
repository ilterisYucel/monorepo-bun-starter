// Zaman damgalı register serisi oynatıcı.
//
// Kullanıcı bir CSV/JSON seri verir: her satır "t, hedef, register, değer[, mod]".
//   • t: saniye (göreli) | "HH:MM:SS" | ISO zaman damgası (ilk satıra göre göreli)
//   • hedef: cihaz anahtarı ("C3.BSC-1", "PCS-7"), glob ("C*.HVAC-*", "PCS-*") veya
//     "type:hvac" / "container:3" seçicisi — aynı anda birden çok cihaz
//   • register: katalog adı ("Current Temp", "BSC SOC (among online racks)") veya
//     "holding:0x0E19" / "input:30055"
//   • mod: hold (varsayılan; değeri Modbus yanıtına bas) | write (EMS gibi yaz → cihaz
//     mantığı tepki verir) | clear (üstyazımı kaldır)
// Ara değer: "step" (satır anında) veya "linear" (aynı hedef+register'ın ardışık
// satırları arasında doğrusal geçiş — rampa).
//
// Mutable by design: oynatma durumu.

export type SeriesMode = "hold" | "write" | "clear";

export interface SeriesRow {
  t: number;
  target: string;
  point: string;
  value: number | null;
  mode: SeriesMode;
}

export interface SeriesSpec {
  id: string;
  name: string;
  timeBase: "sim" | "wall";
  interp: "step" | "linear";
  loop: boolean;
  rows: SeriesRow[];
}

export interface SeriesExecutor {
  /** Seçiciyi cihaz anahtarlarına çözer. */
  select(selector: string): string[];
  apply(key: string, point: string, value: number | null, mode: SeriesMode, source: string): void;
  log(level: "info" | "warn", msg: string): void;
}

export interface SeriesStatus {
  id: string;
  name: string;
  running: boolean;
  elapsed: number;
  duration: number;
  fired: number;
  total: number;
  loops: number;
  errors: number;
  lastError?: string;
}

const HMS = /^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/;

/** Zaman alanını saniyeye çevirir (ISO → epoch saniyesi). */
export function parseTime(s: string): number {
  const x = s.trim();
  if (/^-?\d+(\.\d+)?$/.test(x)) return Number(x);
  const m = HMS.exec(x);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
  const ms = Date.parse(x);
  if (Number.isFinite(ms)) return ms / 1000;
  throw new Error(`Zaman çözümlenemedi: "${s}"`);
}

function splitCsv(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/** CSV metnini satırlara çevirir. Başlık zorunlu: t|time|timestamp, target|device, register|point, value[, mode]. */
export function parseSeriesCsv(text: string): SeriesRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (lines.length < 2) throw new Error("CSV en az başlık + 1 satır içermeli");
  const sep = lines[0]!.includes(";") && !lines[0]!.includes(",") ? ";" : lines[0]!.includes("\t") ? "\t" : ",";
  const head = splitCsv(lines[0]!, sep).map((h) => h.toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const ct = col("t", "time", "timestamp", "zaman");
  const cg = col("target", "device", "cihaz", "hedef");
  const cp = col("register", "point", "nokta", "name");
  const cv = col("value", "deger", "değer");
  const cm = col("mode", "mod");
  if (ct < 0 || cg < 0 || cp < 0 || cv < 0) throw new Error("Başlık eksik: t, target, register, value gerekli");
  const rows: SeriesRow[] = lines.slice(1).map((l, i) => {
    const f = splitCsv(l, sep);
    const vs = f[cv] ?? "";
    const mode = ((cm >= 0 ? f[cm] : "") || "hold").toLowerCase() as SeriesMode;
    if (!["hold", "write", "clear"].includes(mode)) throw new Error(`Satır ${i + 2}: mod '${mode}' geçersiz`);
    const value = vs === "" || mode === "clear" ? null : Number(vs.replace(",", sep === ";" ? "." : ","));
    if (value !== null && !Number.isFinite(value)) throw new Error(`Satır ${i + 2}: değer '${vs}' sayı değil`);
    return { t: parseTime(f[ct] ?? ""), target: f[cg] ?? "", point: f[cp] ?? "", value, mode };
  });
  return normalizeRows(rows);
}

/** Zamanları ilk satıra göre göreli yapar ve sıralar. */
export function normalizeRows(rows: SeriesRow[]): SeriesRow[] {
  if (rows.length === 0) return rows;
  const t0 = Math.min(...rows.map((r) => r.t));
  const rel = t0 > 1e6 ? t0 : 0; // epoch → göreli
  return rows.map((r) => ({ ...r, t: r.t - rel })).sort((a, b) => a.t - b.t);
}

export class SeriesPlayer {
  private spec: SeriesSpec | null = null;
  private startSim = 0;
  private startWall = 0;
  private idx = 0;
  private fired = 0;
  private loops = 0;
  private errors = 0;
  private lastError: string | undefined;
  private elapsed = 0;
  /** linear: (hedef|nokta) → satırlar */
  private tracks = new Map<string, SeriesRow[]>();
  private lastApplied = new Map<string, number>();

  constructor(private readonly exec: SeriesExecutor) {}

  start(spec: SeriesSpec, simT: number): void {
    if (spec.rows.length === 0) throw new Error("Seri boş");
    this.spec = spec;
    this.startSim = simT;
    this.startWall = Date.now() / 1000;
    this.idx = 0;
    this.fired = 0;
    this.loops = 0;
    this.errors = 0;
    this.lastError = undefined;
    this.tracks.clear();
    this.lastApplied.clear();
    if (spec.interp === "linear") {
      for (const r of spec.rows) {
        if (r.mode !== "hold" || r.value === null) continue;
        const k = `${r.target}|${r.point}`;
        const arr = this.tracks.get(k) ?? [];
        arr.push(r);
        this.tracks.set(k, arr);
      }
    }
    this.exec.log("info", `Seri başladı: ${spec.name} (${spec.rows.length} satır, ${this.duration().toFixed(0)} s, ${spec.timeBase === "sim" ? "sim saati" : "duvar saati"}, ${spec.interp})`);
  }

  stop(reason = "durduruldu"): void {
    if (!this.spec) return;
    this.exec.log("info", `Seri ${reason}: ${this.spec.name} (${this.fired}/${this.spec.rows.length} satır)`);
    this.spec = null;
  }

  duration(): number {
    const r = this.spec?.rows;
    return r && r.length ? r[r.length - 1]!.t : 0;
  }

  status(): SeriesStatus | null {
    if (!this.spec) return null;
    return {
      id: this.spec.id,
      name: this.spec.name,
      running: true,
      elapsed: this.elapsed,
      duration: this.duration(),
      fired: this.fired,
      total: this.spec.rows.length,
      loops: this.loops,
      errors: this.errors,
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }

  /** Her fizik adımında çağrılır. */
  tick(simT: number): void {
    const s = this.spec;
    if (!s) return;
    this.elapsed = s.timeBase === "sim" ? simT - this.startSim : Date.now() / 1000 - this.startWall;
    const linear = s.interp === "linear";
    while (this.idx < s.rows.length && s.rows[this.idx]!.t <= this.elapsed) {
      const r = s.rows[this.idx]!;
      this.idx++;
      this.fired++;
      if (linear && r.mode === "hold" && r.value !== null) continue; // izlerden uygulanır
      this.fire(r, r.value);
    }
    if (linear) {
      for (const [k, rows] of this.tracks) {
        let v: number | null = null;
        if (this.elapsed < rows[0]!.t) continue;
        const j = rows.findIndex((r) => r.t > this.elapsed);
        if (j < 0) v = rows[rows.length - 1]!.value;
        else {
          const a = rows[j - 1]!;
          const b = rows[j]!;
          v = a.value! + ((b.value! - a.value!) * (this.elapsed - a.t)) / Math.max(1e-9, b.t - a.t);
        }
        if (v === null) continue;
        const prev = this.lastApplied.get(k);
        if (prev !== undefined && Math.abs(prev - v) < 1e-9) continue;
        this.lastApplied.set(k, v);
        this.fire(rows[0]!, v);
      }
    }
    if (this.idx >= s.rows.length && this.elapsed >= this.duration()) {
      if (s.loop) {
        this.loops++;
        this.idx = 0;
        this.lastApplied.clear();
        this.startSim = simT;
        this.startWall = Date.now() / 1000;
      } else this.stop("bitti");
    }
  }

  private fire(r: SeriesRow, value: number | null): void {
    const name = this.spec?.name ?? "seri";
    let keys: string[];
    try {
      keys = this.exec.select(r.target);
      if (keys.length === 0) throw new Error(`hedef bulunamadı: ${r.target}`);
    } catch (e) {
      this.err(e);
      return;
    }
    for (const k of keys) {
      try {
        this.exec.apply(k, r.point, value, r.mode, `seri:${name}`);
      } catch (e) {
        this.err(e);
      }
    }
  }

  private err(e: unknown): void {
    this.errors++;
    const msg = String((e as Error).message ?? e);
    if (msg !== this.lastError) this.exec.log("warn", `Seri hatası: ${msg}`);
    this.lastError = msg;
  }
}
