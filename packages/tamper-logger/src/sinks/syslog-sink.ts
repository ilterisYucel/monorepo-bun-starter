import { createSocket, type Socket } from "node:dgram";
import { createConnection, type Socket as NetSocket } from "node:net";
import type { LogEvent } from "../types";
import type { ILogSink } from "../interfaces";

/** SyslogSink yapılandırması — tek obje (DI kuralı 3). */
export interface SyslogSinkConfig {
  readonly protocol: "udp" | "tcp";
  readonly host: string;
  readonly port: number;
  /** RFC 5424 APP-NAME (varsayılan: gd-web-service). */
  readonly appName?: string;
}

const SEVERITY: Record<string, number> = {
  debug: 7,
  info: 6,
  warn: 4,
  error: 3,
  fatal: 2,
};

/**
 * SyslogSink — Faz 6 T6.2: RFC 5424 syslog çıkışı (harici SIEM girişi).
 *
 * UDP'de her olay ayrı datagramdır (RFC 6587 non-transparent framing);
 * TCP'de mesajlar `\n` ile frame'lenir, bağlantı koptuğunda yeniden kurulur.
 * Sink içi hata yukarı FIRLATILIR — drop/fail-closed kararı TamperLogger
 * pipeline'ındadır (sink'te değil).
 */
export class SyslogSink implements ILogSink {
  private udpSocket: Socket | undefined;
  private tcpSocket: NetSocket | undefined;
  private closed = false;

  constructor(
    private readonly config: SyslogSinkConfig,
    private readonly createUdp?: () => Socket,
    private readonly createTcp?: () => NetSocket,
  ) {}

  name(): string {
    return "syslog";
  }

  static formatFrame(event: LogEvent, host: string, app: string): string {
    const severity = SEVERITY[event.level] ?? 6;
    const pri = 13 * 8 + severity;
    const timestamp = event.ts.endsWith("Z") ? event.ts : `${event.ts}Z`;
    return (
      `<${pri}>1 ${timestamp} ${host} ${app} - - - ` +
      `${JSON.stringify(event)}`
    );
  }

  async write(events: LogEvent[]): Promise<void> {
    if (this.closed) {
      throw new Error("[SyslogSink] kapalı — yazma reddedildi");
    }
    if (events.length === 0) return;
    const app = this.config.appName ?? "gd-web-service";
    const frames = events.map((event) =>
      SyslogSink.formatFrame(event, this.config.host, app),
    );
    if (this.config.protocol === "udp") {
      this.udpSocket ??= (this.createUdp ?? (() => createSocket("udp4")))();
      for (const frame of frames) {
        await new Promise<void>((resolve, reject) => {
          this.udpSocket!.send(
            Buffer.from(frame),
            this.config.port,
            this.config.host,
            (error) => (error ? reject(error) : resolve()),
          );
        });
      }
      return;
    }
    // TCP: \n frame'li — kopuşta yeniden bağlan.
    if (!this.tcpSocket || this.tcpSocket.destroyed) {
      this.tcpSocket = (this.createTcp ??
        (() =>
          createConnection({
            host: this.config.host,
            port: this.config.port,
          })))();
      await new Promise<void>((resolve, reject) => {
        this.tcpSocket!.once("connect", () => resolve());
        this.tcpSocket!.once("error", reject);
      });
    }
    await new Promise<void>((resolve, reject) => {
      this.tcpSocket!.write(
        frames.map((frame) => `${frame}\n`).join(""),
        (error) => (error ? reject(error) : resolve()),
      );
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.udpSocket) {
      this.udpSocket.close();
      this.udpSocket = undefined;
    }
    if (this.tcpSocket && !this.tcpSocket.destroyed) {
      await new Promise<void>((resolve) => {
        this.tcpSocket!.end(() => resolve());
      });
      this.tcpSocket = undefined;
    }
  }
}
