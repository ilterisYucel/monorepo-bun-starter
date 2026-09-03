import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpWebhookSink } from "./http-webhook-sink";
import type { LogEvent } from "../types";

/**
 * HttpWebhookSink (T6.2) sözleşmesi:
 * - JSON batch POST + HMAC-SHA256 imza başlığı (X-Signature: sha256=<hex>).
 * - 2xx → başarı; retry yok.
 * - 5xx/ağ hatası → `retries` kadar backoff'lu deneme; tükenince THROW
 *   (drop kararı logger'dadır).
 * - close() sonrası write fırlatır.
 */

function makeEvent(): LogEvent {
  return {
    ts: "2026-08-26T12:00:00.000Z",
    level: "error",
    category: "security",
    eventCode: "login_failed",
    message: "Giris basarisiz",
    context: {},
    correlationId: "c-1",
    service: "web-service",
    host: "f",
    seq: 1,
    prevHash: "0",
    signature: "s",
  } as LogEvent;
}

describe("HttpWebhookSink (T6.2)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeSink(secret?: string) {
    fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const sink = new HttpWebhookSink({
      url: "https://siem.example/ingest",
      secret,
      retries: 2,
      backoffMs: 1,
    });
    return sink;
  }

  it("JSON batch + HMAC imza başlığı ile POST eder", async () => {
    const sink = makeSink("supersecret");
    await sink.write([makeEvent()]);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://siem.example/ingest");
    expect(options.method).toBe("POST");
    const body = JSON.parse(String(options.body));
    expect(Array.isArray(body)).toBe(true);
    const signature = (options.headers as Record<string, string>)["X-Signature"];
    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("secret yoksa imza başlığı gönderilmez", async () => {
    const sink = makeSink(undefined);
    await sink.write([makeEvent()]);
    const headers = (fetchMock.mock.calls[0] as [string, RequestInit])[1]
      .headers as Record<string, string>;
    expect(headers["X-Signature"]).toBeUndefined();
  });

  it("5xx → retries kadar dener, tükenince fırlatır", async () => {
    fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("fail", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const sink = new HttpWebhookSink({
      url: "https://siem.example/ingest",
      retries: 2,
      backoffMs: 1,
    });
    await expect(sink.write([makeEvent()])).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 ilk + 2 retry
  });

  it("2xx sonrası retry YOK", async () => {
    const sink = makeSink();
    await sink.write([makeEvent()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("close sonrası write fırlatır; close idempotent", async () => {
    const sink = makeSink();
    await sink.close();
    await sink.close();
    await expect(sink.write([makeEvent()])).rejects.toThrow();
  });
});
