import { describe, it, expect } from "vitest";
import { ValidationError } from "../result";
import { HubPeerRegistry } from "./registry";

/**
 * T6 — HubPeerRegistry saf kayıt sözleşmesi (WS-TUNNEL-OPAK-SERVIS-ERISIMI §6.1):
 *
 * - SAF: constructor argümansız; WS/timer/HTTP/persistence bağımlılığı yok.
 * - Komutlar void: register (ekle/değiştir — servis listesi DEĞİŞİR), updateServices,
 *   unregister. Sorgular: peers, servicesOf, isConnected.
 * - Opaklık: yalnız id+meta saklanır; hedef/protokol alanı yok.
 */
describe("HubPeerRegistry (T6)", () => {
  it("AK-1.7: saf sınıf — argümansız kurulur, taşıma bağımlılığı taşımaz", () => {
    const registry = new HubPeerRegistry();
    // Constructor arity 0 → WS/timer/HTTP/persistence enjekte edilmez (DI kuralı).
    expect(HubPeerRegistry.length).toBe(0);
    expect(registry.servicesOf("yok")).toEqual([]);
  });

  it("AK-1.7: register + servicesOf kaydı döner", () => {
    const registry = new HubPeerRegistry();
    registry.register({
      peerId: "revpi-001",
      peerType: "device",
      services: [{ id: "local-admin", meta: { title: "RevPi Admin" } }],
    });
    expect(registry.servicesOf("revpi-001")).toEqual([
      { id: "local-admin", meta: { title: "RevPi Admin" } },
    ]);
    expect(registry.isConnected("revpi-001")).toBe(true);
  });

  it("AK-1.8: yeniden register servis listesini DEĞİŞTİRİR (birleşmez)", () => {
    const registry = new HubPeerRegistry();
    registry.register({ peerId: "p", peerType: "device", services: [{ id: "A" }] });
    registry.register({ peerId: "p", peerType: "device", services: [{ id: "B" }] });
    expect(registry.servicesOf("p")).toEqual([{ id: "B" }]);
  });

  it("servis listesi yoksa register geçerli (boş dizi)", () => {
    const registry = new HubPeerRegistry();
    registry.register({ peerId: "p", peerType: "field" });
    expect(registry.servicesOf("p")).toEqual([]);
    expect(registry.peers()).toEqual([
      { peerId: "p", peerType: "field", services: [] },
    ]);
  });

  it("boş peerId → ValidationError (fail-closed)", () => {
    const registry = new HubPeerRegistry();
    expect(() => registry.register({ peerId: "  ", peerType: "device" })).toThrow(
      ValidationError,
    );
  });

  it("aynı id iki kez → son değer kazanır (idempotent)", () => {
    const registry = new HubPeerRegistry();
    registry.register({
      peerId: "p",
      peerType: "device",
      services: [{ id: "x", meta: { title: "eski" } }, { id: "x", meta: { title: "yeni" } }],
    });
    expect(registry.servicesOf("p")).toEqual([{ id: "x", meta: { title: "yeni" } }]);
  });

  it("updateServices kayıtlı peer'ı günceller", () => {
    const registry = new HubPeerRegistry();
    registry.register({ peerId: "p", peerType: "device", services: [{ id: "A" }] });
    registry.updateServices("p", [{ id: "C" }]);
    expect(registry.servicesOf("p")).toEqual([{ id: "C" }]);
  });

  it("updateServices kayıt yoksa sessiz no-op", () => {
    const registry = new HubPeerRegistry();
    registry.updateServices("yok", [{ id: "C" }]);
    expect(registry.isConnected("yok")).toBe(false);
    expect(registry.servicesOf("yok")).toEqual([]);
  });

  it("unregister kaydı düşürür (idempotent)", () => {
    const registry = new HubPeerRegistry();
    registry.register({ peerId: "p", peerType: "device" });
    registry.unregister("p");
    registry.unregister("p");
    expect(registry.isConnected("p")).toBe(false);
    expect(registry.peers()).toEqual([]);
  });

  it("peers() kayıtlı peer'ları listeler", () => {
    const registry = new HubPeerRegistry();
    registry.register({ peerId: "a", peerType: "field" });
    registry.register({ peerId: "b", peerType: "device", services: [{ id: "s" }] });
    expect(registry.peers().map((p) => p.peerId)).toEqual(["a", "b"]);
  });
});
