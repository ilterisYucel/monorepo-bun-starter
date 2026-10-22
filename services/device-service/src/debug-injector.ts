// DebugInjector — device-service içinde çalışan, YALNIZCA dev/debug akışında
// açılan küçük HTTP ucu. Testlerin saha simülatörlerine arıza/durum enjekte
// etmesini sağlar (entegrasyon + e2e test paketi; `DEBUG_INJECT_ENABLED=true`).
//
// Sözleşme:
// - `start()` / `stop()`: yaşam döngüsü (idempotent).
// - `POST /inject` gövde `{ deviceId, scenario }` → enjeksiyon uygulanırsa
//   `200 {applied:true}`; bilinmeyen cihaz/senaryo → `404 {applied:false}`;
//   geçersiz gövde → `400`.
// - `GET /health` → `200 {ok:true}`.
//
// Prod'da BAŞLATILMAZ (wiring kapısı run.ts'te: NODE_ENV!=="production" ve
// DEBUG_INJECT_ENABLED==="true"). Yalnızca loopback'e bağlanır.

import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";

/** Enjeksiyonu uygulayan hedef (SimulatorHost uyarlaması). */
export interface InjectionTarget {
  /** Komut — senaryoyu enjekte eder; bilinmeyen cihaz/senaryo → `false`. */
  inject(deviceId: string, scenario: string): boolean;
}

/** DebugInjector yapılandırması. */
export interface DebugInjectorConfig {
  readonly port: number;
  readonly host?: string;
}

/** Debug mesajı — yapılandırılmış log için tek satır (opsiyonel). */
export interface DebugInjectorLog {
  info(message: string): void;
  warn(message: string): void;
}

/** İstek gövdesini okur ve JSON çözer (bozuk → undefined). */
async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
    if (chunks.reduce((n, c) => n + c.length, 0) > 16_384) return undefined;
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (raw.length === 0) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function isInjectBody(value: unknown): value is { deviceId: string; scenario: string } {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body["deviceId"] === "string" && typeof body["scenario"] === "string";
}

export class DebugInjector {
  private readonly target: InjectionTarget;
  private readonly config: DebugInjectorConfig;
  private readonly log: DebugInjectorLog;
  private server: Server | undefined;

  constructor(target: InjectionTarget, config: DebugInjectorConfig, log: DebugInjectorLog) {
    if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) {
      throw new Error(`[DebugInjector] geçersiz port: ${String(config.port)}`);
    }
    this.target = target;
    this.config = config;
    this.log = log;
  }

  /** Komut — HTTP ucunu açar (idempotent). */
  async start(): Promise<void> {
    if (this.server !== undefined) return;
    const server = createServer((request, response) => {
      void this.handle(request, response);
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(this.config.port, this.config.host ?? "127.0.0.1", () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
    this.server = server;
    this.log.info(
      `[DebugInjector] dinliyor: http://${this.config.host ?? "127.0.0.1"}:${this.config.port}`,
    );
  }

  /** Komut — HTTP ucunu kapatır (idempotent). */
  async stop(): Promise<void> {
    const server = this.server;
    if (server === undefined) return;
    this.server = undefined;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  /** Sorgu — dinlenen port (başlamadan config portu). */
  port(): number {
    const address = this.server?.address();
    return typeof address === "object" && address !== null ? address.port : this.config.port;
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const method = request.method ?? "GET";
    const url = request.url ?? "/";

    if (method === "GET" && url === "/health") {
      this.respond(response, 200, { ok: true });
      return;
    }

    if (method === "POST" && url === "/inject") {
      const body = await readJsonBody(request);
      if (!isInjectBody(body)) {
        this.respond(response, 400, { error: "deviceId ve scenario zorunlu" });
        return;
      }
      const applied = this.target.inject(body.deviceId, body.scenario);
      if (!applied) this.log.warn(`[DebugInjector] uygulanamadı: ${body.deviceId}/${body.scenario}`);
      this.respond(response, applied ? 200 : 404, { applied });
      return;
    }

    this.respond(response, 404, { error: "not found" });
  }

  private respond(response: ServerResponse, status: number, payload: unknown): void {
    const body = JSON.stringify(payload);
    response.writeHead(status, { "content-type": "application/json" });
    response.end(body);
  }
}
