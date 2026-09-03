import { describe, it, expect, vi } from "vitest";
import { SessionAudit, SESSION_AUDIT_DDL } from "./session-audit";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { IAuditSink } from "@gd-monorepo/ws-tunnel";

/**
 * SessionAudit (T3.4) — IAuditSink implementasyonu (PG + TamperLogger):
 * - ensureSchema → session_audit DDL'i
 * - open → INSERT + session_open security logu (fail-closed — logger hatası
 *   yukarı fırlar)
 * - close → UPDATE + session_end security logu
 */
describe("SessionAudit (T3.4)", () => {
  function makeSql(execute: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(undefined)) {
    return {
      execute,
      query: vi.fn(),
      queryOne: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      health: vi.fn().mockResolvedValue(true),
    } as unknown as ISqlDatabase;
  }

  const logger = { log: vi.fn().mockResolvedValue(undefined) } as unknown as TamperLogger;

  it("ensureSchema session_audit DDL'ini kurar", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const audit = new SessionAudit(makeSql(execute), logger);
    await audit.ensureSchema();
    expect(execute).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS session_audit"));
  });

  it("open → INSERT + security logu; logger hatası fail-closed", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const audit = new SessionAudit(makeSql(execute), logger);
    await audit.open({
      fieldId: "f-1",
      containerId: "c-1",
      sessionId: "s-1",
      username: "op",
      fieldRole: "teknik",
      containerRole: "teknik",
      remoteIp: "10.0.0.5",
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO session_audit"),
      expect.arrayContaining(["s-1", "op", "10.0.0.5"]),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "security",
        eventCode: "session_open",
      }),
    );

    const failingLogger = {
      log: vi.fn().mockRejectedValue(new Error("sink down")),
    } as unknown as TamperLogger;
    const failing = new SessionAudit(makeSql(execute), failingLogger);
    await expect(
      failing.open({
        fieldId: "f-1",
        containerId: "c-1",
        sessionId: "s-2",
        username: "op",
        fieldRole: "teknik",
        containerRole: "teknik",
      }),
    ).rejects.toThrow("sink down");
  });

  it("close → UPDATE + security logu", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const audit = new SessionAudit(makeSql(execute), logger);
    await audit.close({
      sessionId: "s-1",
      endReason: "operator-end",
      bytesIn: 10,
      bytesOut: 20,
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE session_audit"),
      ["s-1", "operator-end", 10, 20],
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "session_end" }),
    );
  });

  it("SESSION_AUDIT_DDL dışa açıktır (init kullanımı)", () => {
    expect(SESSION_AUDIT_DDL).toContain("session_audit");
  });

  it("IAuditSink sözleşmesini uygular (derleme kanıtı)", () => {
    const audit = new SessionAudit(makeSql(), logger);
    const asSink: IAuditSink = audit;
    expect(asSink).toBe(audit);
  });
});
