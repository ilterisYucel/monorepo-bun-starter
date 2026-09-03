import type { LogEvent } from "../types";
import type { ILogSink } from "../interfaces";

/** HttpSmsNotifier yapılandırması — tek obje (DI kuralı 3). */
export interface HttpSmsNotifierConfig {
  readonly url: string;
  readonly phones: string[];
  /**
   * İstek gövdesi şablonu — `{{phone}}`, `{{eventCode}}`, `{{message}}`,
   * `{{ts}}` yer tutucuları ilk olaydan doldurulur (NetGSM vb. için örnek
   * şablonlar DOGRULAMA'da).
   */
  readonly bodyTemplate: string;
  readonly headers?: Record<string, string>;
}

/**
 * HttpSmsNotifier — Faz 6 T6.7: sağlayıcıdan bağımsız HTTP SMS bildirimi.
 *
 * ILogSink: cooldown'dan geçen olay(lar)ın İLKİ şablona basılır; her telefon
 * numarası için ayrı POST atılır. 2xx dışı yanıt FIRLATILIR — retry/drop
 * kararı AlertNotifier katmanındadır.
 */
export class HttpSmsNotifier implements ILogSink {
  private closed = false;

  constructor(private readonly config: HttpSmsNotifierConfig) {}

  name(): string {
    return "http-sms-notifier";
  }

  async write(events: LogEvent[]): Promise<void> {
    if (this.closed) {
      throw new Error("[HttpSmsNotifier] kapalı — yazma reddedildi");
    }
    if (events.length === 0) return;
    const event = events[0];
    for (const phone of this.config.phones) {
      const body = this.config.bodyTemplate
        .replaceAll("{{phone}}", phone)
        .replaceAll("{{eventCode}}", event.eventCode)
        .replaceAll("{{message}}", event.message)
        .replaceAll("{{ts}}", event.ts);
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body,
      });
      if (!response.ok) {
        throw new Error(
          `[HttpSmsNotifier] ${response.status} ${response.statusText}`,
        );
      }
    }
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}
