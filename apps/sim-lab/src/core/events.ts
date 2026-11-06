// Olay günlüğü — cihaz durum geçişleri, teşhisler, komutlar, uyumluluk uyarıları.
// Arayüz SSE ile canlı izler; halka tampon (son N kayıt).

export type EventLevel = "info" | "warn" | "alarm" | "fault" | "cmd" | "compat";

export interface SimEvent {
  id: number;
  /** Duvar saati (ms, epoch). */
  t: number;
  /** Simülasyon saati (s). */
  simT: number;
  level: EventLevel;
  device: string;
  msg: string;
  /** Uyumluluk uyarıları için tekilleştirme anahtarı. */
  key?: string;
}

export interface CompatWarning {
  key: string;
  device: string;
  msg: string;
  /** Gerçek cihazda ne olurdu. */
  realBehavior: string;
  count: number;
  firstT: number;
  lastT: number;
}

type Listener = (e: SimEvent) => void;

export class EventLog {
  private seq = 0;
  private readonly ring: SimEvent[] = [];
  private readonly listeners = new Set<Listener>();
  readonly compat = new Map<string, CompatWarning>();
  simTime = 0;

  constructor(private readonly capacity = 2000) {}

  push(level: EventLevel, device: string, msg: string, key?: string): SimEvent {
    const e: SimEvent = { id: ++this.seq, t: Date.now(), simT: this.simTime, level, device, msg, ...(key ? { key } : {}) };
    this.ring.push(e);
    if (this.ring.length > this.capacity) this.ring.splice(0, this.ring.length - this.capacity);
    for (const l of this.listeners) l(e);
    return e;
  }

  /**
   * Uyumluluk uyarısı — EMS'in yaptığı bir şey gerçek cihazda farklı sonuç verirdi.
   * Aynı anahtar tekrarlandıkça sayaç artar; günlüğe yalnız ilk kez yazılır.
   */
  compatWarn(device: string, key: string, msg: string, realBehavior: string): void {
    const k = `${device}:${key}`;
    const now = Date.now();
    const existing = this.compat.get(k);
    if (existing) {
      existing.count++;
      existing.lastT = now;
      return;
    }
    this.compat.set(k, { key: k, device, msg, realBehavior, count: 1, firstT: now, lastT: now });
    this.push("compat", device, `${msg} — Gerçek cihaz: ${realBehavior}`, k);
  }

  since(id: number, limit = 500): SimEvent[] {
    const out = this.ring.filter((e) => e.id > id);
    return out.slice(-limit);
  }

  recent(limit = 300): SimEvent[] {
    return this.ring.slice(-limit);
  }

  onEvent(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  clear(): void {
    this.ring.length = 0;
    this.compat.clear();
  }
}
