import { describe, it, expect, vi } from "vitest";
import { SmtpNotifier } from "./smtp-notifier";
import type { LogEvent } from "../types";

/**
 * SmtpNotifier (T6.7) sözleşmesi:
 * - ILogSink: AlertNotifier cooldown'undan geçen olayları tek mailde toplar.
 * - Konu: "[ALERT] <eventCode>" + ilk olay mesajı; gövde JSON satırları.
 * - Yapılandırılmış `to` listesinin tümüne gönderilir.
 * - SMTP hatası FIRLATILIR (AlertNotifier'ın retry/drop davranışı üsttedir).
 * - close() idempotent; kapandıktan sonra write fırlatır.
 * - Test transporter'ı enjekte edilebilir (streamTransport — canlı SMTP yok).
 */

function makeEvent(overrides?: Partial<LogEvent>): LogEvent {
  return {
    ts: "2026-08-26T12:00:00.000Z",
    level: "error",
    category: "security",
    eventCode: "login_locked",
    message: "Hesap gecici kilitlendi",
    context: { username: "admin" },
    correlationId: "c-1",
    service: "web-service",
    host: "f",
    seq: 1,
    prevHash: "0",
    signature: "s",
    ...overrides,
  } as LogEvent;
}

function makeStreamTransport() {
  const sent: unknown[] = [];
  const transporter = {
    sendMail: vi.fn(async (mail: unknown) => {
      sent.push(mail);
    }),
    close: vi.fn(),
  };
  return { transporter, sent };
}

const config = {
  host: "smtp.example.com",
  port: 587,
  user: "alerts",
  pass: "secret",
  from: "alerts@example.com",
  to: ["ops@example.com"],
};

describe("SmtpNotifier (T6.7)", () => {
  it("olayları tek mailde toplar (konu + JSON gövde)", async () => {
    const { transporter, sent } = makeStreamTransport();
    const notifier = new SmtpNotifier(config, transporter as never);
    await notifier.write([
      makeEvent(),
      makeEvent({ eventCode: "session_anomaly" }),
    ]);
    await notifier.close();
    expect(sent).toHaveLength(1);
    const mail = sent[0] as { subject: string; text: string; to: string };
    expect(mail.subject).toContain("login_locked");
    expect(mail.subject).toContain("Hesap gecici kilitlendi");
    expect(mail.text).toContain("login_locked");
    expect(mail.text).toContain("session_anomaly");
    expect(mail.to).toBe("ops@example.com");
  });

  it("close idempotent; kapandıktan sonra write fırlatır", async () => {
    const { transporter } = makeStreamTransport();
    const notifier = new SmtpNotifier(config, transporter as never);
    await notifier.close();
    await notifier.close();
    await expect(notifier.write([makeEvent()])).rejects.toThrow();
  });

  it("SMTP hatası fırlatılır", async () => {
    const transporter = {
      sendMail: vi.fn().mockRejectedValue(new Error("smtp down")),
    };
    const notifier = new SmtpNotifier(config, transporter as never);
    await expect(notifier.write([makeEvent()])).rejects.toThrow("smtp down");
  });
});
