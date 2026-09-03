import { createHmac, createHash } from "node:crypto";
import type { LogEvent } from "../types";
import type { ILogSink } from "../interfaces";

/** HttpWebhookSink yapılandırması — tek obje (DI kuralı 3). */
export interface HttpWebhookSinkConfig {
  readonly url: string;
  /** HMAC-SHA256 imza anahtarı — yoksa imza başlığı gönderilmez. */
  readonly secret?: string;
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly backoffMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 500;

/**
 * HttpWebhookSink — Faz 6 T6.2: harici SIEM/event alıcısına JSON batch POST.
 *
 * `X-Signature: sha256=<hex>` başlığıyla bütünlük/doğrulama (alıcı aynı
 * anahtarla HMAC'i doğrular). 5xx/ağ hatasında `retries` kadar backoff'lu
 * deneme; tükenince FIRLATIR — drop kararı TamperLogger pipeline'ındadır.
 */
export class HttpWebhookSink implements ILogSink {
  private closed = false;

  constructor(private readonly config: HttpWebhookSinkConfig) {}

  name(): string {
    return "http-webhook";
  }

  async write(events: LogEvent[]): Promise<void> {
    if (this.closed) {
      throw new Error("[HttpWebhookSink] kapalı — yazma reddedildi");
    }
    if (events.length === 0) return;

    const body = JSON.stringify(events);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.secret) {
      headers["X-Signature"] = signBody(body, this.config.secret);
    }

    const retries = this.config.retries ?? DEFAULT_RETRIES;
    const backoffMs = this.config.backoffMs ?? DEFAULT_BACKOFF_MS;
    const timeoutMs = this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.config.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok) return;
        lastError = new Error(
          `[HttpWebhookSink] ${response.status} ${response.statusText}`,
        );
      } catch (error) {
        lastError = error;
      }
      if (attempt < retries) {
        await sleep(backoffMs * 2 ** attempt);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError));
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

/** HMAC-SHA256 imza — sink testlerinden bağımsız doğrulanabilir saf yardımcı. */
export function signBody(body: string, secret: string): string {
  const hmac = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hmac}`;
}

/** T6.2 — kurtarma kodu hash'i (SHA-256 hex) — service-token ile aynı yaklaşım. */
export function sha256Of(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
