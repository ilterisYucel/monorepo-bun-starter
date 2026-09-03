import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ContainerSessionStore } from "./session-store";
import { JoseSignerForTests } from "./__test-helpers__/jose-signer";
import type { ContainerSessionUser } from "./session-store";

/**
 * T3.3 container tarafı — ContainerSessionStore sözleşmesi (tasarım §5.4/§5.7):
 *
 * - `open(sessionId, user)` → kısa ömürlü konteyner JWT'si (kendi JWT_SECRET'i —
 *   field içeriğini görmez, secret paylaşımı yok) + `expiresInSec` (4 saat).
 * - `authenticate(token)` → imza doğrulama + bellek kaydı → kullanıcı (eşlenmiş
 *   konteyner rolüyle); geçersiz/tahrifli/iptal token → undefined.
 * - `end(sessionId)` → iptal; TTL (4 sa) ve idle (15 dk) sweep'leri otomatik
 *   kapatır (orphan session temizliği — kırılganlık #3).
 * - Kullanıcı konteyner DB'sine ASLA yazılmaz — geçici oturumdur (§5.7).
 */

const user: ContainerSessionUser = { id: "u-1", username: "operator", role: "guest" };

function makeStore(overrides: {
  ttlSec?: number;
  idleTimeoutSec?: number;
  now?: () => number;
} = {}) {
  const adapter = new JoseSignerForTests("container-secret-test-0123456789");
  const store = new ContainerSessionStore(adapter, overrides);
  return store;
}

describe("ContainerSessionStore (T3.3)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(0) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("open() / authenticate()", () => {
    it("open → token doğrulanır, kullanıcı + rol döner", async () => {
      const store = makeStore();
      const { token, expiresInSec } = await store.open("s-1", user);
      expect(expiresInSec).toBe(4 * 60 * 60);
      const authed = await store.authenticate(token);
      expect(authed).toEqual(user);
    });

    it("geçersiz token undefined döner", async () => {
      const store = makeStore();
      expect(await store.authenticate("garbage")).toBeUndefined();
    });

    it("tahrifli token (farklı secret) undefined döner", async () => {
      const store = makeStore();
      await store.open("s-1", user);
      const forgedAdapter = new JoseSignerForTests("baska-secret-0123456789abcdefghij");
      const forged = await forgedAdapter.sign(
        { sessionId: "s-1", sub: "u-1", username: "operator", role: "admin" },
        100,
      );
      expect(await store.authenticate(forged)).toBeUndefined();
    });

    it("bilinmeyen sessionId'li geçerli-imza token da reddedilir", async () => {
      const store = makeStore();
      const adapter = new JoseSignerForTests("container-secret-test-0123456789");
      await store.open("s-1", user);
      const token = await adapter.sign(
        { sessionId: "s-bilinmeyen", sub: "u-1", username: "x", role: "guest" },
        100,
      );
      expect(await store.authenticate(token)).toBeUndefined();
    });
  });

  describe("end()", () => {
    it("iptal sonrası authenticate undefined döner", async () => {
      const store = makeStore();
      const { token } = await store.open("s-1", user);
      store.end("s-1");
      expect(await store.authenticate(token)).toBeUndefined();
      expect(store.activeCount()).toBe(0);
    });
  });

  describe("TTL + idle sweep", () => {
    it("4 saat TTL dolunca oturum kapanır", async () => {
      // idle eşiği TTL'den büyük — bu test yalnızca TTL davranışını ölçer
      const store = makeStore({ idleTimeoutSec: 10 * 60 * 60 });
      const { token } = await store.open("s-1", user);
      vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 1000);
      store.sweep();
      expect(await store.authenticate(token)).toBeUndefined();
      expect(store.activeCount()).toBe(0);
    });

    it("15 dk idle → oturum kapanır; aktivite süreyi uzatır", async () => {
      const store = makeStore();
      const { token } = await store.open("s-1", user);
      vi.advanceTimersByTime(10 * 60 * 1000);
      expect(await store.authenticate(token)).toEqual(user); // aktivite
      vi.advanceTimersByTime(10 * 60 * 1000); // toplam 20 dk, son aktivite 10 dk önce
      expect(await store.authenticate(token)).toEqual(user);
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000); // son aktiviteden 15 dk geçti
      store.sweep();
      expect(await store.authenticate(token)).toBeUndefined();
    });

    it("sweep TTL'den önce oturumu kapatmaz", async () => {
      // idle eşiği TTL'den büyük — yalnızca TTL sınırı test edilir
      const store = makeStore({ idleTimeoutSec: 10 * 60 * 60 });
      const { token } = await store.open("s-1", user);
      vi.advanceTimersByTime(3 * 60 * 60 * 1000);
      store.sweep();
      expect(await store.authenticate(token)).toEqual(user);
    });

    it("activeCount açık oturum sayısını döner", async () => {
      const store = makeStore();
      await store.open("s-1", user);
      await store.open("s-2", user);
      expect(store.activeCount()).toBe(2);
      store.end("s-2");
      expect(store.activeCount()).toBe(1);
    });
  });

  describe("role eşlemesi passthrough", () => {
    it("field'da eşlenen konteyner rolü korunur", async () => {
      const store = makeStore();
      const { token } = await store.open("s-1", {
        id: "u-2",
        username: "teknik-1",
        role: "admin",
      });
      expect((await store.authenticate(token))?.role).toBe("admin");
    });
  });
});
