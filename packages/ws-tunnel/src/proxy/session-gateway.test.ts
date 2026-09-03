import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ContainerSessionGateway, mapFieldRole } from "./session-gateway";
import { FieldSessionStore } from "./field-session-store";
import type { IFieldChannel } from "../channel";
import type { IAuditSink } from "../audit";

import type { TunnelUser } from "../types";


/**
 * T3.3 — ContainerSessionGateway sözleşmesi (tasarım §5.4-§5.7):
 * - Rol eşlemesi (§5.5, 2026-08-30 BİREBİR): field rolü konteynere aynen
 *   taşınır (admin→admin, teknik→teknik, boss→boss, guest→guest,
 *   developer→developer); konteyner tarafı aynı rbac matrisiyle korur
 *   (patron konteynerde manevra/kullanıcı YÖNETEMEZ — matris).
 * - Limit: 1 etkileşimli oturum/konteyner → 409; konteyner bağlı değil → 503.
 * - open-session → konteyner ack'i (token) → session_audit FAIL-CLOSED
 *   (audit hatası = oturum açılmaz) → kayıt + outcome.
 * - ack zaman aşımı → 503; closeSession → session-end + audit close; sweep →
 *   süresi dolanlar session-end ile kapatılır.
 */

function makeUser(overrides: Partial<TunnelUser> = {}): TunnelUser {
  return {
    id: "u-1",
    username: "operator",
    role: "teknik",
    ...overrides,
  };
}

interface FakeChannel {
  channel: IFieldChannel;
  sentControls: unknown[];
  emitControl(message: unknown): void;
}

function makeChannel(connected = true): FakeChannel {
  const subscribers = new Set<(c: string, m: unknown) => void>();
  const sentControls: unknown[] = [];
  const channel = {
    isConnected: () => connected,
    sendControl: (_containerId: string, message: unknown) => {
      sentControls.push(message);
    },
    sendBinary: () => {},
    onControlMessage: (cb: (c: string, m: unknown) => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    onBinaryFrame: () => () => {},
  } as IFieldChannel;
  return {
    channel,
    sentControls,
    emitControl: (message) => {
      for (const cb of subscribers) cb("c-1", message);
    },
  };
}

function makeAudit(fail = false) {
  const open = vi.fn().mockImplementation(async () => {
    if (fail) throw new Error("sink down");
  });
  const close = vi.fn().mockResolvedValue(undefined);
  return { audit: { open, close } as IAuditSink, open, close };
}

describe("mapFieldRole (§5.5 — 2026-08-30 birebir)", () => {
  it("tüm roller aynen taşınır (birebir eşleme)", () => {
    expect(mapFieldRole("admin")).toBe("admin");
    expect(mapFieldRole("teknik")).toBe("teknik");
    expect(mapFieldRole("boss")).toBe("boss");
    expect(mapFieldRole("guest")).toBe("guest");
    expect(mapFieldRole("developer")).toBe("developer");
  });
});

describe("ContainerSessionGateway (T3.3)", () => {
  let fake: FakeChannel;
  let store: FieldSessionStore;
  let gateway: ContainerSessionGateway;
  let auditFake: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(0) });
    fake = makeChannel();
    store = new FieldSessionStore({ now: () => Date.now() });
    auditFake = makeAudit();
    gateway = new ContainerSessionGateway(
      fake.channel,
      store,
      auditFake.audit,
      undefined,
      { ackTimeoutMs: 1000, now: () => Date.now() },
    );
    gateway.initialize();
  });

  afterEach(() => {
    gateway.stop();
    vi.useRealTimers();
  });

  it("2026-08-30: guest oturum AÇABİLİR — konteyner rolü guest (birebir)", async () => {
    const pending = gateway.openSession({
      fieldId: "f-1",
      containerId: "c-1",
      user: makeUser({ role: "guest" }),
    });
    await vi.advanceTimersByTimeAsync(0);
    const open = fake.sentControls.findLast(
      (m) => (m as { type: string }).type === "open-session",
    ) as { sessionId: string } | undefined;
    expect(open).toBeDefined();
    fake.emitControl({
      type: "open-session-ack",
      sessionId: open!.sessionId,
      token: "container-jwt",
      expiresInSec: 14400,
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    const result = await pending;
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.unwrap().containerRole).toBe("guest");
    }
  });

  it("konteyner bağlı değilse 503 (TransientError)", async () => {
    const offline = makeChannel(false);
    const offlineGateway = new ContainerSessionGateway(
      offline.channel,
      store,
      auditFake.audit,
      undefined,
    );
    const result = await offlineGateway.openSession({
      fieldId: "f-1",
      containerId: "c-1",
      user: makeUser(),
    });
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error().kind).toBe("transient");
  });

  it("ikinci açılış eskisini 'replaced' ile kapatır ve yenisini açar (Faz 5)", async () => {
    const first = await openSession();
    expect(first.isOk()).toBe(true);
    const firstSessionId = first.unwrap().sessionId;

    const second = await openSession();
    expect(second.isOk()).toBe(true);
    const secondSessionId = second.unwrap().sessionId;
    expect(secondSessionId).not.toBe(firstSessionId);
    // eski oturum session-end (replaced) ile kapatıldı
    const replaced = fake.sentControls.find(
      (m) =>
        (m as { type: string; reason: string }).type === "session-end" &&
        (m as { reason: string }).reason === "replaced",
    );
    expect(replaced).toMatchObject({ sessionId: firstSessionId });
    expect(store.activeCount()).toBe(1);
  });

  it("ack zaman aşımı → 503 (TransientError)", async () => {
    const result = gateway.openSession({
      fieldId: "f-1",
      containerId: "c-1",
      user: makeUser(),
    });
    vi.advanceTimersByTime(1000);
    const outcome = await result;
    expect(outcome.isErr()).toBe(true);
    expect(outcome.isErr() && outcome.error().kind).toBe("transient");
  });

  it("audit hatası → fail-closed (oturum açılmaz, FatalError)", async () => {
    const failing = makeAudit(true);
    const failingGateway = new ContainerSessionGateway(
      fake.channel,
      store,
      failing.audit,
      undefined,
      { ackTimeoutMs: 1000 },
    );
    failingGateway.initialize();
    const pending = failingGateway.openSession({
      fieldId: "f-1",
      containerId: "c-1",
      user: makeUser(),
    });
    await vi.advanceTimersByTimeAsync(0);
    const open = fake.sentControls.findLast(
      (m) => (m as { type: string }).type === "open-session",
    ) as { sessionId: string } | undefined;
    fake.emitControl({
      type: "open-session-ack",
      sessionId: open!.sessionId,
      token: "container-jwt",
      expiresInSec: 14400,
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    const result = await pending;
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error().kind).toBe("fatal");
    expect(store.activeCount()).toBe(0);
    failingGateway.stop();
  });

  it("closeSession → session-end frame + audit close + kayıt düşer", async () => {
    const outcome = await openSession();
    expect(outcome.isOk()).toBe(true);
    const sessionId = outcome.unwrap().sessionId;
    gateway.closeSession(sessionId, "operator-end");
    const sessionEnd = fake.sentControls.find(
      (m) => (m as { type: string }).type === "session-end",
    );
    expect(sessionEnd).toMatchObject({ sessionId, reason: "operator-end" });
    expect(store.activeCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(auditFake.close).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId, endReason: "operator-end" }),
    );
  });

  it("sweep süresi dolan oturumu session-end ile kapatır", async () => {
    await openSession();
    // gateway sweep'i (60 sn aralık) 4 saatlik TTL geçince oturumu kapatır
    vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 1000);
    expect(store.activeCount()).toBe(0);
    expect(
      fake.sentControls.some(
        (m) =>
          (m as { type: string; reason: string }).type === "session-end" &&
          (m as { reason: string }).reason === "expired",
      ),
    ).toBe(true);
  });

  it("sessionForContainer acik oturumu konteyner kimligiyle bulur", async () => {
    const outcome = await openSession();
    const sessionId = outcome.unwrap().sessionId;
    const found = gateway.sessionForContainer("c-1");
    expect(found?.sessionId).toBe(sessionId);
    expect(gateway.sessionForContainer("yok")).toBeUndefined();
  });

  it("sessionByToken kayıtlı oturumu döner", async () => {
    const outcome = await openSession();
    const token = outcome.unwrap().token;
    const session = gateway.sessionByToken(token);
    expect(session?.containerId).toBe("c-1");
    expect(gateway.sessionByToken("yok")).toBeUndefined();
  });

  async function openSession() {
    const pending = gateway.openSession({
      fieldId: "f-1",
      containerId: "c-1",
      user: makeUser(),
      remoteIp: "10.0.0.5",
    });
    await ackSession(pending);
    return pending;
  }

  async function ackSession(
    pending: ReturnType<ContainerSessionGateway["openSession"]>,
  ): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
    const open = fake.sentControls.findLast(
      (m) => (m as { type: string }).type === "open-session",
    ) as { sessionId: string } | undefined;
    expect(open).toBeDefined();
    fake.emitControl({
      type: "open-session-ack",
      sessionId: open!.sessionId,
      token: "container-jwt",
      expiresInSec: 14400,
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
    void pending;
  }
});

