// LabModbusServer — bir cihaz yüzünü (DeviceFace) gerçek Modbus TCP sunucusu olarak
// yayınlar. packages/simulators ModbusServerBridge'in event modelini izler; ek olarak:
//   • FC politikası (gerçek cihazın desteklemediği FC → lenient: yanıtla + uyarı, strict: 0x01)
//   • Haberleşme arızası enjeksiyonu (offline / timeout / gecikme / exception / donmuş veri / kayıp)
//   • Trafik kaydı + istemci istatistikleri (EMS bağlı mı, ne okuyor, ne yazıyor)

import { createServer, type Server, type Socket } from "node:net";
import { ModbusTCPServer, ModbusTCPResponse, responses } from "jsmodbus";
import type { ModbusAbstractRequest, ModbusTCPRequest } from "jsmodbus";
import type { EventLog } from "../core/events";

export type WordTable = "holding" | "input";
export type BitTable = "coil" | "discrete";
export type Table = WordTable | BitTable;

/** Modbus exception — yüzler fırlatır, sunucu exception yanıtına çevirir. */
export class ModbusError extends Error {
  constructor(
    readonly code: 1 | 2 | 3 | 4 | 6,
    message = "",
  ) {
    super(message || `Modbus exception 0x0${code}`);
  }
}

type Maybe<T> = T | Promise<T>;

/** Cihazın register yüzü — model durumundan anlık değer üretir. */
export interface DeviceFace {
  readWords(table: WordTable, addr: number, count: number): Maybe<number[]>;
  readBits(table: BitTable, addr: number, count: number): Maybe<boolean[]>;
  writeWords(addr: number, values: number[], fc: 6 | 16): Maybe<void>;
  writeBits(addr: number, values: boolean[], fc: 5 | 15): Maybe<void>;
}

export type CommMode = "online" | "offline" | "timeout" | "delay" | "exception" | "freeze" | "lossy";

export interface CommFault {
  mode: CommMode;
  delayMs?: number;
  exceptionCode?: 1 | 2 | 3 | 4 | 6;
  /** lossy: yanıt verilmeyen istek oranı 0..1 */
  dropRatio?: number;
}

export interface TrafficEntry {
  t: number;
  device: string;
  client: string;
  fc: number;
  addr: number;
  count: number;
  ok: boolean;
  /** exception kodu veya "timeout" / "drop" */
  result: string;
  values?: number[];
}

export interface LabServerOptions {
  deviceId: string;
  host: string;
  port: number;
  face: DeviceFace;
  events: EventLog;
  /** Gerçek cihazın desteklediği FC'ler (yoksa hepsi). */
  supportedFc?: readonly number[];
  /** strict → desteklenmeyen FC = 0x01; lenient → yanıtla + uyumluluk uyarısı. */
  fcStrict?: () => boolean;
  /** Gerçek cihaz adı (uyarı metinleri için). */
  realDeviceName?: string;
  traffic: (e: TrafficEntry) => void;
}

const FC_NAMES: Record<number, string> = {
  1: "FC01 Read Coils",
  2: "FC02 Read Discrete Inputs",
  3: "FC03 Read Holding",
  4: "FC04 Read Input",
  5: "FC05 Write Coil",
  6: "FC06 Write Register",
  15: "FC15 Write Coils",
  16: "FC16 Write Registers",
};

export interface ServerStats {
  port: number;
  listening: boolean;
  clients: string[];
  requests: number;
  reads: number;
  writes: number;
  errors: number;
  lastRequestAt: number;
  lastWriteAt: number;
  bindError?: string;
}

export class LabModbusServer {
  private net: Server | undefined;
  private readonly sockets = new Set<Socket>();
  private readonly freezeCache = new Map<string, number[] | boolean[]>();
  fault: CommFault = { mode: "online" };
  readonly stats: ServerStats;

  constructor(private readonly o: LabServerOptions) {
    this.stats = {
      port: o.port,
      listening: false,
      clients: [],
      requests: 0,
      reads: 0,
      writes: 0,
      errors: 0,
      lastRequestAt: 0,
      lastWriteAt: 0,
    };
  }

  get deviceId(): string {
    return this.o.deviceId;
  }

  async start(): Promise<void> {
    if (this.net) return;
    const net = createServer();
    net.on("connection", (s) => {
      this.sockets.add(s);
      this.refreshClients();
      s.on("close", () => {
        this.sockets.delete(s);
        this.refreshClients();
      });
      s.on("error", () => undefined);
      if (this.fault.mode === "offline") s.destroy();
    });
    const modbus = new ModbusTCPServer(net as never, {
      coils: undefined,
      discrete: undefined,
      holding: undefined,
      input: undefined,
    } as never);
    this.register(modbus);
    try {
      await new Promise<void>((resolve, reject) => {
        const onErr = (e: Error): void => reject(e);
        net.once("error", onErr);
        net.listen(this.o.port, this.o.host, () => {
          net.off("error", onErr);
          resolve();
        });
      });
      this.net = net;
      this.stats.listening = true;
      delete this.stats.bindError;
    } catch (e) {
      this.stats.listening = false;
      this.stats.bindError = String((e as Error).message ?? e);
      this.o.events.push("fault", this.o.deviceId, `Port açılamadı ${this.o.host}:${this.o.port} — ${this.stats.bindError}`);
    }
  }

  async stop(): Promise<void> {
    const net = this.net;
    if (!net) return;
    this.net = undefined;
    for (const s of this.sockets) s.destroy();
    this.sockets.clear();
    this.stats.listening = false;
    this.refreshClients();
    await new Promise<void>((r) => net.close(() => r()));
  }

  setFault(f: CommFault): void {
    const prev = this.fault.mode;
    this.fault = f;
    if (f.mode === "freeze") this.freezeCache.clear();
    if (f.mode === "offline") {
      for (const s of this.sockets) s.destroy();
    }
    if (prev !== f.mode) {
      this.o.events.push(
        f.mode === "online" ? "info" : "fault",
        this.o.deviceId,
        f.mode === "online" ? "Haberleşme normale döndü" : `Haberleşme arızası: ${f.mode}${f.delayMs ? ` (${f.delayMs} ms)` : ""}${f.exceptionCode ? ` (0x0${f.exceptionCode})` : ""}`,
      );
    }
  }

  private refreshClients(): void {
    this.stats.clients = [...this.sockets].map((s) => `${s.remoteAddress ?? "?"}:${s.remotePort ?? "?"}`);
  }

  private clientOf(request: ModbusAbstractRequest): string {
    const r = request as unknown as { socket?: Socket };
    const s = r.socket;
    return s ? `${s.remoteAddress ?? "?"}:${s.remotePort ?? "?"}` : "?";
  }

  private register(server: ModbusTCPServer): void {
    const readWords = (fc: 3 | 4, table: WordTable) => (request: ModbusAbstractRequest, cb: (b: Buffer) => void) => {
      const { start, count } = range(request);
      this.handle(request, cb, fc, start, count, async () => {
        const values = await this.withFreeze(`${fc}:${start}:${count}`, () => this.o.face.readWords(table, start, count));
        const body =
          fc === 3
            ? new responses.ReadHoldingRegistersResponseBody(values.length * 2, values as number[])
            : new responses.ReadInputRegistersResponseBody(values.length * 2, values as number[]);
        return { body, values: values as number[] };
      });
    };
    const readBits = (fc: 1 | 2, table: BitTable) => (request: ModbusAbstractRequest, cb: (b: Buffer) => void) => {
      const { start, count } = range(request);
      this.handle(request, cb, fc, start, count, async () => {
        const values = (await this.withFreeze(`${fc}:${start}:${count}`, () => this.o.face.readBits(table, start, count))) as boolean[];
        const body =
          fc === 1
            ? new responses.ReadCoilsResponseBody(values, Math.ceil(values.length / 8))
            : new responses.ReadDiscreteInputsResponseBody(values, Math.ceil(values.length / 8));
        return { body, values: values.slice(0, 16).map((b) => (b ? 1 : 0)) };
      });
    };
    server.on("readHoldingRegisters", readWords(3, "holding"));
    server.on("readInputRegisters", readWords(4, "input"));
    server.on("readCoils", readBits(1, "coil"));
    server.on("readDiscreteInputs", readBits(2, "discrete"));

    server.on("writeSingleRegister", (request, cb) => {
      const b = request.body as unknown as { address: number; value: number };
      this.handle(request, cb, 6, b.address, 1, async () => {
        await this.o.face.writeWords(b.address, [b.value], 6);
        return { body: responses.WriteSingleRegisterResponseBody.fromRequest(request.body as never), values: [b.value], write: true };
      });
    });
    server.on("writeMultipleRegisters", (request, cb) => {
      const b = request.body as unknown as { address: number; valuesAsArray: number[] };
      this.handle(request, cb, 16, b.address, b.valuesAsArray.length, async () => {
        await this.o.face.writeWords(b.address, b.valuesAsArray, 16);
        return { body: responses.WriteMultipleRegistersResponseBody.fromRequest(request.body as never), values: b.valuesAsArray, write: true };
      });
    });
    server.on("writeSingleCoil", (request, cb) => {
      const b = request.body as unknown as { address: number; value: number };
      this.handle(request, cb, 5, b.address, 1, async () => {
        await this.o.face.writeBits(b.address, [b.value === 0xff00], 5);
        return { body: responses.WriteSingleCoilResponseBody.fromRequest(request.body as never), values: [b.value === 0xff00 ? 1 : 0], write: true };
      });
    });
    server.on("writeMultipleCoils", (request, cb) => {
      const b = request.body as unknown as { address: number; valuesAsArray: boolean[] };
      this.handle(request, cb, 15, b.address, b.valuesAsArray.length, async () => {
        await this.o.face.writeBits(b.address, b.valuesAsArray, 15);
        return { body: responses.WriteMultipleCoilsResponseBody.fromRequest(request.body as never), values: b.valuesAsArray.map((x) => (x ? 1 : 0)), write: true };
      });
    });
  }

  private async withFreeze<T extends number[] | boolean[]>(key: string, read: () => Maybe<T>): Promise<T> {
    if (this.fault.mode !== "freeze") return await read();
    const cached = this.freezeCache.get(key);
    if (cached) return cached as T;
    const v = await read();
    this.freezeCache.set(key, v);
    return v;
  }

  private handle(
    request: ModbusAbstractRequest,
    cb: (b: Buffer) => void,
    fc: number,
    addr: number,
    count: number,
    produce: () => Promise<{ body: { createPayload(): Buffer }; values?: number[]; write?: boolean }>,
  ): void {
    const client = this.clientOf(request);
    const st = this.stats;
    st.requests++;
    st.lastRequestAt = Date.now();
    const log = (ok: boolean, result: string, values?: number[]): void =>
      this.o.traffic({ t: Date.now(), device: this.o.deviceId, client, fc, addr, count, ok, result, ...(values ? { values: values.slice(0, 12) } : {}) });

    const f = this.fault;
    if (f.mode === "offline") {
      (request as unknown as { socket?: Socket }).socket?.destroy();
      return;
    }
    if (f.mode === "timeout") {
      log(false, "timeout");
      return; // yanıt yok → istemci zaman aşımına düşer
    }
    if (f.mode === "lossy" && Math.random() < (f.dropRatio ?? 0.3)) {
      log(false, "drop");
      return;
    }
    if (f.mode === "exception") {
      st.errors++;
      log(false, `exc 0x0${f.exceptionCode ?? 4}`);
      cb(exceptionPayload(request, f.exceptionCode ?? 4));
      return;
    }

    // FC politikası
    const sup = this.o.supportedFc;
    if (sup && !sup.includes(fc)) {
      const strict = this.o.fcStrict?.() ?? false;
      this.o.events.compatWarn(
        this.o.deviceId,
        `fc${fc}`,
        `EMS ${FC_NAMES[fc] ?? `FC${fc}`} kullanıyor (adres ${addr})`,
        `${this.o.realDeviceName ?? "Cihaz"} yalnız ${sup.map((x) => `FC${String(x).padStart(2, "0")}`).join("/")} destekler → 0x01 Illegal Function`,
      );
      if (strict) {
        st.errors++;
        log(false, "exc 0x01");
        cb(exceptionPayload(request, 1));
        return;
      }
    }

    const run = async (): Promise<void> => {
      try {
        const r = await produce();
        if (r.write) {
          st.writes++;
          st.lastWriteAt = Date.now();
        } else st.reads++;
        log(true, "ok", r.values);
        cb(ModbusTCPResponse.fromRequest(request as unknown as ModbusTCPRequest, r.body as never).createPayload());
      } catch (e) {
        const code = e instanceof ModbusError ? e.code : 4;
        st.errors++;
        log(false, `exc 0x0${code}`);
        cb(exceptionPayload(request, code));
      }
    };
    if (f.mode === "delay" && (f.delayMs ?? 0) > 0) setTimeout(() => void run(), f.delayMs);
    else void run();
  }
}

function range(request: ModbusAbstractRequest): { start: number; count: number } {
  const b = request.body as unknown as { start: number; count: number };
  return { start: b.start, count: b.count };
}

function exceptionPayload(request: ModbusAbstractRequest, code: number): Buffer {
  const fc = (request.body as unknown as { fc: number }).fc;
  const body = new responses.ExceptionResponseBody(fc as never, code as never);
  return ModbusTCPResponse.fromRequest(request as unknown as ModbusTCPRequest, body).createPayload();
}
