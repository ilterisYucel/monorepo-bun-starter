// packages/simulators/src/server/modbus-server-bridge.ts
//
// ModbusServerBridge — bir simülatörün register portunu GERÇEK bir Modbus TCP
// sunucusu olarak yayınlar (self-host). device-service saf TCP görür; simülatör
// bilgisi `packages/simulators`'ta kalır (SIMULATOR-MIMARISI K2/K3, REV.01).
//
// jsmodbus server'ın **event modeli** kullanılır (server buffer'ı YOK): kütüphane
// isteği çözümler ve `readX`/`writeX` event'ini yayar; yanıtı biz üretiriz.
// Gerekçe (REV.01): hook modeli yazma reddini/exception 0x02'yi desteklemez —
// `postWrite*` yazma uygulandıktan sonra çalışır, `preWrite*` yanıtı iptal edemez.
//
// Fail davranışı: adapter hatası → `ExceptionResponseBody(fc, 0x04)`; korununan
// aralığa yazım → `ExceptionResponseBody(fc, 0x02)`; server her durumda ayakta.

import { createServer } from "node:net";
import { ModbusTCPServer, ModbusTCPResponse, responses } from "jsmodbus";
import type { ModbusAbstractRequest, ModbusTCPRequest } from "jsmodbus";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";

/** Korunabilen yazma tabloları (input/discrete salt-okunurdur). */
export type WriteProtectedTable = "holding" | "coil";

/** Yazma koruması — `ranges` yoksa tüm tablo korunur; varsa yalnız bu aralıklar. */
export interface WriteProtection {
  readonly table: WriteProtectedTable;
  readonly ranges?: readonly (readonly [number, number])[];
}

/** Korunabilen okuma tabloları (REV.02). */
export type ReadProtectedTable = "holding" | "coil" | "discrete" | "input";

/** Okuma koruması — `ranges` yoksa tüm tablo korunur; varsa yalnız bu aralıklar. */
export interface ReadProtection {
  readonly table: ReadProtectedTable;
  readonly ranges?: readonly (readonly [number, number])[];
}

/** ModbusServerBridge yapılandırması — tek obje (DI kuralı 3). */
export interface ModbusServerBridgeConfig {
  readonly adapter: IModbusSimulatorAdapter;
  /** Bind adresi (default 127.0.0.1). */
  readonly host?: string;
  /** Bind portu — 0 = ephemaral (test). */
  readonly port: number;
  readonly writeProtected?: WriteProtection;
  readonly readProtected?: ReadProtection;
}

type ErrorCode = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 11;
type FunctionCode = 1 | 2 | 3 | 4 | 5 | 6 | 15 | 16;

/**
 * node:net `Server` için ihtiyaç duyduğumuz yapısal görünüm (bun-types'ta
 * `once`/`off` EventEmitter üyeleri görünmediğinden dar bir arayüz kullanılır).
 */
interface ListenableServer {
  listen(port: number, host: string, callback: () => void): void;
  once(event: "error", listener: (error: Error) => void): void;
  off(event: "error", listener: (error: Error) => void): void;
  address(): string | { port: number } | null;
  close(callback: () => void): void;
}

/**
 * ModbusServerBridge — sözleşme:
 * - `constructor` port aralığını doğrular (0-65535 dışı → throw).
 * - `start()` net server + `ModbusTCPServer` (buffer'sız) + event handler'ları
 *   kurar; port doluysa reject eder (fail-fast). Tekrar çağrı no-op.
 * - `stop()` sunucuyu kapatır (idempotent); start'sız çağrı no-op.
 * - Tam FC seti: 01/02/03/04 (okuma) + 05/06/0F/10 (yazma).
 * - Okumalar adapter'dan ANLIK gelir; yazımlar adapter'a iletilir.
 */
export class ModbusServerBridge {
  private readonly adapter: IModbusSimulatorAdapter;
  private readonly host: string;
  private readonly configuredPort: number;
  private readonly writeProtected: WriteProtection | undefined;
  private readonly readProtected: ReadProtection | undefined;
  private server: ListenableServer | undefined;
  private boundPort = 0;

  constructor(config: ModbusServerBridgeConfig) {
    if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) {
      throw new Error("[ModbusServerBridge] port 0-65535 aralığında olmalı");
    }
    this.adapter = config.adapter;
    this.host = config.host ?? "127.0.0.1";
    this.configuredPort = config.port;
    this.writeProtected = config.writeProtected;
    this.readProtected = config.readProtected;
  }

  /** Sunucunun dinlediği gerçek port (start sonrası; 0 = ephemaral öncesi). */
  port(): number {
    return this.boundPort;
  }

  /** Sunucuyu başlatır — port doluysa reject (fail-fast). Idempotent. */
  async start(): Promise<void> {
    if (this.server) return;

    const netServer = createServer() as unknown as ListenableServer;
    const modbus = new ModbusTCPServer(netServer as never, {
      coils: undefined,
      discrete: undefined,
      holding: undefined,
      input: undefined,
    });
    this.register(modbus);

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => reject(error);
      netServer.once("error", onError);
      netServer.listen(this.configuredPort, this.host, () => {
        netServer.off("error", onError);
        resolve();
      });
    });

    const address = netServer.address();
    this.boundPort =
      typeof address === "object" && address !== null ? address.port : this.configuredPort;
    this.server = netServer;
  }

  /** Sunucuyu kapatır (idempotent) — açık istemci bağlantıları zorla kapatılır. */
  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = undefined;
    await new Promise<void>((resolve) => {
      const forcible = server as unknown as { closeAllConnections?: () => void };
      forcible.closeAllConnections?.();
      server.close(() => resolve());
    });
  }

  private register(server: ModbusTCPServer): void {
    server.on("readCoils", (request, cb) => {
      const { start, count } = readRange(request);
      if (this.readProtected !== undefined && isWithin(this.readProtected, "coil", start, start + count - 1)) {
        cb(this.exceptionPayload(request, 2));
        return;
      }
      this.run(request, cb, () =>
        this.adapter
          .readCoils(start, count)
          .then((values) =>
            this.payload(
              request,
              new responses.ReadCoilsResponseBody(values, Math.ceil(values.length / 8)),
            ),
          ),
      );
    });

    server.on("readDiscreteInputs", (request, cb) => {
      const { start, count } = readRange(request);
      if (this.readProtected !== undefined && isWithin(this.readProtected, "discrete", start, start + count - 1)) {
        cb(this.exceptionPayload(request, 2));
        return;
      }
      this.run(request, cb, () =>
        this.adapter
          .readDiscreteInputs(start, count)
          .then((values) =>
            this.payload(
              request,
              new responses.ReadDiscreteInputsResponseBody(
                values,
                Math.ceil(values.length / 8),
              ),
            ),
          ),
      );
    });

    server.on("readHoldingRegisters", (request, cb) => {
      const { start, count } = readRange(request);
      if (this.readProtected !== undefined && isWithin(this.readProtected, "holding", start, start + count - 1)) {
        cb(this.exceptionPayload(request, 2));
        return;
      }
      this.run(request, cb, () =>
        this.adapter
          .readHoldingRegisters(start, count)
          .then((values) =>
            this.payload(
              request,
              new responses.ReadHoldingRegistersResponseBody(values.length * 2, values),
            ),
          ),
      );
    });

    server.on("readInputRegisters", (request, cb) => {
      const { start, count } = readRange(request);
      if (this.readProtected !== undefined && isWithin(this.readProtected, "input", start, start + count - 1)) {
        cb(this.exceptionPayload(request, 2));
        return;
      }
      this.run(request, cb, () =>
        this.adapter
          .readInputRegisters(start, count)
          .then((values) =>
            this.payload(
              request,
              new responses.ReadInputRegistersResponseBody(values.length * 2, values),
            ),
          ),
      );
    });

    server.on("writeSingleCoil", (request, cb) => {
      const body = request.body as unknown as { address: number; value: number };
      if (this.isProtected("coil", body.address, body.address)) {
        cb(this.exceptionPayload(request, 2));
        return;
      }
      this.run(request, cb, () =>
        this.adapter
          .writeCoil(body.address, body.value === 0xff00)
          .then(() =>
            this.payload(
              request,
              responses.WriteSingleCoilResponseBody.fromRequest(request.body as never),
            ),
          ),
      );
    });

    server.on("writeSingleRegister", (request, cb) => {
      const body = request.body as unknown as { address: number; value: number };
      if (this.isProtected("holding", body.address, body.address)) {
        cb(this.exceptionPayload(request, 2));
        return;
      }
      this.run(request, cb, () =>
        this.adapter
          .writeHoldingRegister(body.address, body.value)
          .then(() =>
            this.payload(
              request,
              responses.WriteSingleRegisterResponseBody.fromRequest(request.body as never),
            ),
          ),
      );
    });

    server.on("writeMultipleCoils", (request, cb) => {
      const body = request.body as unknown as { address: number; valuesAsArray: boolean[] };
      const end = body.address + body.valuesAsArray.length - 1;
      if (this.isProtected("coil", body.address, end)) {
        cb(this.exceptionPayload(request, 2));
        return;
      }
      this.run(request, cb, () =>
        this.adapter
          .writeMultipleCoils(body.address, body.valuesAsArray)
          .then(() =>
            this.payload(
              request,
              responses.WriteMultipleCoilsResponseBody.fromRequest(request.body as never),
            ),
          ),
      );
    });

    server.on("writeMultipleRegisters", (request, cb) => {
      const body = request.body as unknown as { address: number; valuesAsArray: number[] };
      const end = body.address + body.valuesAsArray.length - 1;
      if (this.isProtected("holding", body.address, end)) {
        cb(this.exceptionPayload(request, 2));
        return;
      }
      this.run(request, cb, () =>
        this.adapter
          .writeHoldingRegisters(body.address, body.valuesAsArray)
          .then(() =>
            this.payload(
              request,
              responses.WriteMultipleRegistersResponseBody.fromRequest(request.body as never),
            ),
          ),
      );
    });
  }

  private run(
    request: ModbusAbstractRequest,
    cb: (payload: Buffer) => void,
    produce: () => Promise<Buffer>,
  ): void {
    produce()
      .then((payload) => cb(payload))
      .catch(() => cb(this.exceptionPayload(request, 4)));
  }

  private payload(
    request: ModbusAbstractRequest,
    body: { createPayload(): Buffer },
  ): Buffer {
    return ModbusTCPResponse.fromRequest(
      request as unknown as ModbusTCPRequest,
      body as never,
    ).createPayload();
  }

  private exceptionPayload(request: ModbusAbstractRequest, code: ErrorCode): Buffer {
    const fc = (request.body as unknown as { fc: number }).fc as FunctionCode;
    const body = new responses.ExceptionResponseBody(fc, code);
    return ModbusTCPResponse.fromRequest(
      request as unknown as ModbusTCPRequest,
      body,
    ).createPayload();
  }

  private isProtected(table: WriteProtectedTable, start: number, end: number): boolean {
    return isWithin(this.writeProtected, table, start, end);
  }
}

/** Korumalı aralık eşleşmesi — `ranges` yoksa tüm tablo korunur (ortak yardımcı). */
function isWithin(
  protection: { table: string; ranges?: readonly (readonly [number, number])[] } | undefined,
  table: string,
  start: number,
  end: number,
): boolean {
  if (protection === undefined || protection.table !== table) return false;
  if (protection.ranges === undefined || protection.ranges.length === 0) return true;
  return protection.ranges.some(([low, high]) => start <= high && end >= low);
}

function readRange(request: ModbusAbstractRequest): { start: number; count: number } {
  const body = request.body as unknown as { start: number; count: number };
  return { start: body.start, count: body.count };
}
