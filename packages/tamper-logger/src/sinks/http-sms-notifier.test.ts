import { describe, it, expect, vi, afterEach } from "vitest";
import { HttpSmsNotifier } from "./http-sms-notifier";
import type { LogEvent } from "../types";

/**
 * HttpSmsNotifier (T6.7) sözleşmesi:
 * - Provider-agnostic HTTP POST: config'deki `bodyTemplate`'e `{{eventCode}}`,
 *   `{{message}}`, `{{ts}}` değerleri basılır; her telefon ayrı istek.
 * - 2xx → başarı; hata FIRLATILIR (retry kararı üstte).
 * - close() idempotent; kapandıktan sonra write fırlatır.
 */

function makeEvent(): LogEvent {
  return {
    ts: "2026-08-26T12:00:00.000Z",
    level: "error",
    category: "security",
    eventCode: "login_locked",
    message: "Hesap gecici kilitlendi",
    context: {},
    correlationId: "c-1",
    service: "web-service",
    host: "f",
    seq: 1,
    prevHash: "0",
    signature: "s",
  } as LogEvent;
}

const config = {
  url: "https://sms.example.com/send",
  phones: ["+905551112233", "+905554445566"],
  bodyTemplate: '{"to":"{{phone}}","text":"[{{eventCode}}] {{message}}"}',
  headers: { Authorization: "Bearer sms-key" },
};

describe("HttpSmsNotifier (T6.7)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("her telefon için şablonlu ayrı POST atar", async () => {
    fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const notifier = new HttpSmsNotifier(config);
    await notifier.write([makeEvent()]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://sms.example.com/send");
    const body = JSON.parse(String(options.body));
    expect(body.to).toBe("+905551112233");
    expect(body.text).toContain("login_locked");
    expect(body.text).toContain("Hesap gecici kilitlendi");
  });

  it("hata fırlatılır", async () => {
    fetchMock = vi.fn().mockResolvedValue(new Response("no", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const notifier = new HttpSmsNotifier(config);
    await expect(notifier.write([makeEvent()])).rejects.toThrow();
  });

  it("close sonrası write fırlatır; close idempotent", async () => {
    const notifier = new HttpSmsNotifier(config);
    await notifier.close();
    await notifier.close();
    await expect(notifier.write([makeEvent()])).rejects.toThrow();
  });
});
