import nodemailer, { type Transporter } from "nodemailer";
import type { LogEvent } from "../types";
import type { ILogSink } from "../interfaces";

/** SmtpNotifier yapılandırması — tek obje (DI kuralı 3). */
export interface SmtpNotifierConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly pass: string;
  readonly from: string;
  readonly to: string[];
  readonly secure?: boolean;
}

/**
 * SmtpNotifier — Faz 6 T6.7: AlertNotifier çıkışı olarak e-posta bildirimi.
 *
 * ILogSink'tir: cooldown'dan geçen olaylar tek mailde toplanır (konu
 * "[ALERT] <eventCode>", gövde satır başına JSON). SMTP hatası FIRLATILIR —
 * retry/drop kararı AlertNotifier/logger katmanındadır. Testlerde
 * transporter enjekte edilir (streamTransport).
 */
export class SmtpNotifier implements ILogSink {
  private readonly transporter: Transporter;
  private closed = false;

  constructor(
    private readonly config: SmtpNotifierConfig,
    transporter?: Transporter,
  ) {
    this.transporter =
      transporter ??
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure ?? false,
        auth: { user: config.user, pass: config.pass },
      });
  }

  name(): string {
    return "smtp-notifier";
  }

  async write(events: LogEvent[]): Promise<void> {
    if (this.closed) {
      throw new Error("[SmtpNotifier] kapalı — yazma reddedildi");
    }
    if (events.length === 0) return;
    const first = events[0];
    const subject = `[ALERT] ${first.eventCode} — ${first.message}`;
    const body = events.map((event) => JSON.stringify(event)).join("\n");
    await this.transporter.sendMail({
      from: this.config.from,
      to: this.config.to.join(", "),
      subject,
      text: body,
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    this.transporter.close();
  }
}
