import { describe, it, expect, expectTypeOf } from "vitest";
import {
  TUNNEL_PROTOCOL_VERSION,
  DEFAULT_TUNNEL_OPERATIONAL_CONFIG,
  tunnelOperationalConfigSchema,
  isPeerConnectionState,
} from "./messages";
import type {
  PeerConnectionState,
  TunnelConnectorState,
  TunnelOperationalConfig,
  RegisterMessage,
  RegisterAckMessage,
  HeartbeatMessage,
  TelemetryMessage,
  ConfigUpdateMessage,
  ErrorMessage,
  EventMessage,
  StreamOpenMessage,
  OpenSessionMessage,
  OpenSessionAckMessage,
} from "./messages";

/**
 * T2.0 — TunnelConnector kontrol kanalı sözleşmesi (TESTING.md §8.1):
 *
 * - `PeerConnectionState` — field tarafı görünümü: "idle" (kayıtlı ama kapalı),
 *   "connected" (heartbeat akıyor), "stale" (45 sn sessizlik), "error".
 *   transport `ConnectionState`'ından AYRIDIR (tünel/telemetri transportu "stale" bilmez).
 * - `TunnelConnectorState` — konteyner tarafı durum makinesi (§6 diyagramı):
 *   offline → connecting → registered → connected; connecting/connected → backoff;
 *   backoff → connecting. "backoff" = yeniden bağlanma bekleniyor.
 * - Kontrol mesajları — JSON text frame'leri (§4.1): register (ilk mesaj,
 *   protocolVersion zorunlu), register-ack (status "ok"|"rejected" + opsiyonel
 *   operational config), heartbeat (ts = gönderen saati ms), telemetry (en güncel
 *   snapshot), config-update (canlı config push — restart yok), error (kod + mesaj).
 * - `TunnelOperationalConfig` — ZORUNLU alan YOK; bilinmeyen anahtarlar strip edilir
 *   (ileri uyumluluk); aralıklar 1000-300000 ms bandında tam sayı olmalı.
 * - `DEFAULT_TUNNEL_OPERATIONAL_CONFIG` — heartbeat 15 sn, telemetry 15 sn
 *   (tasarım §4.3: 15 sn heartbeat, 45 sn stale).
 */

describe("TunnelConnector sözleşmesi (T2.0)", () => {
  describe("TUNNEL_PROTOCOL_VERSION", () => {
    it("2'dir — sürümlü protokol (v2: peerId+peerType register) (tasarım §12.3)", () => {
      expect(TUNNEL_PROTOCOL_VERSION).toBe(2);
    });
  });

  describe("tunnelOperationalConfigSchema", () => {
    it("tam config'i kabul eder", () => {
      const parsed = tunnelOperationalConfigSchema.parse({
        heartbeatIntervalMs: 10000,
        telemetryIntervalMs: 20000,
      });
      expect(parsed).toEqual({
        heartbeatIntervalMs: 10000,
        telemetryIntervalMs: 20000,
      });
    });

    it("kısmi config'i kabul eder (yalnızca heartbeat)", () => {
      const parsed = tunnelOperationalConfigSchema.parse({
        heartbeatIntervalMs: 5000,
      });
      expect(parsed.telemetryIntervalMs).toBeUndefined();
    });

    it("boş config'i kabul eder (tüm alanlar opsiyonel)", () => {
      expect(tunnelOperationalConfigSchema.parse({})).toEqual({});
    });

    it("bilinmeyen anahtarları strip eder — ileri uyumluluk", () => {
      const parsed = tunnelOperationalConfigSchema.parse({
        heartbeatIntervalMs: 5000,
        sessionLimit: 2,
        pathAllowlist: ["/api/*"],
      });
      expect(parsed).toEqual({ heartbeatIntervalMs: 5000 });
    });

    it("1000 ms altını reddeder", () => {
      expect(() =>
        tunnelOperationalConfigSchema.parse({ heartbeatIntervalMs: 999 }),
      ).toThrow();
    });

    it("300000 ms üstünü reddeder", () => {
      expect(() =>
        tunnelOperationalConfigSchema.parse({ telemetryIntervalMs: 300001 }),
      ).toThrow();
    });

    it("ondalıklı değeri reddeder", () => {
      expect(() =>
        tunnelOperationalConfigSchema.parse({ heartbeatIntervalMs: 15.5 }),
      ).toThrow();
    });

    it("tip uyuşmazlığını reddeder", () => {
      expect(() =>
        tunnelOperationalConfigSchema.parse({ heartbeatIntervalMs: "fast" }),
      ).toThrow();
    });
  });

  describe("DEFAULT_TUNNEL_OPERATIONAL_CONFIG", () => {
    it("heartbeat 15 sn — tasarım §4.3", () => {
      expect(DEFAULT_TUNNEL_OPERATIONAL_CONFIG.heartbeatIntervalMs).toBe(15000);
    });

    it("telemetry 15 sn", () => {
      expect(DEFAULT_TUNNEL_OPERATIONAL_CONFIG.telemetryIntervalMs).toBe(15000);
    });

    it("dondurulmuştur (immutable)", () => {
      expect(Object.isFrozen(DEFAULT_TUNNEL_OPERATIONAL_CONFIG)).toBe(true);
    });
  });

  describe("isPeerConnectionState", () => {
    it("geçerli durumları tanır", () => {
      for (const s of ["idle", "connected", "stale", "error"] as const) {
        expect(isPeerConnectionState(s)).toBe(true);
      }
    });

    it("geçersiz durumları reddeder", () => {
      expect(isPeerConnectionState("connecting")).toBe(false);
      expect(isPeerConnectionState("nope")).toBe(false);
      expect(isPeerConnectionState("")).toBe(false);
    });
  });

  describe("kontrol mesajı tipleri (discriminated union)", () => {
    it("RegisterMessage alanlarını sabitler", () => {
      const msg: RegisterMessage = {
        type: "register",
        peerId: "container-1",
        peerType: "container",
        containerUrl: "http://web:80",
        protocolVersion: TUNNEL_PROTOCOL_VERSION,
      };
      expectTypeOf(msg).toEqualTypeOf<RegisterMessage>();
      expect(msg.type).toBe("register");
    });

    it("RegisterAckMessage opsiyonel config taşır", () => {
      const ok: RegisterAckMessage = {
        type: "register-ack",
        status: "ok",
        serverTime: "2026-08-25T10:00:00.000Z",
      };
      const withCfg: RegisterAckMessage = {
        ...ok,
        config: { heartbeatIntervalMs: 5000 },
      };
      expect(withCfg.config?.heartbeatIntervalMs).toBe(5000);
    });

    it("HeartbeatMessage ms timestamp taşır", () => {
      const hb: HeartbeatMessage = { type: "heartbeat", ts: 1756116000000 };
      expect(hb.ts).toBeGreaterThan(0);
    });

    it("TelemetryMessage TelemetryData dizisi taşır", () => {
      const tm: TelemetryMessage = { type: "telemetry", data: [] };
      expectTypeOf(tm.data).toEqualTypeOf<
        import("../types").TunnelTelemetryPoint[]
      >();
    });

    it("ConfigUpdateMessage tam config taşır", () => {
      const cu: ConfigUpdateMessage = {
        type: "config-update",
        config: { telemetryIntervalMs: 30000 },
      };
      expect(cu.type).toBe("config-update");
    });

    it("ErrorMessage kod + mesaj taşır", () => {
      const err: ErrorMessage = {
        type: "error",
        code: "protocol-error",
        message: "Bilinmeyen frame",
      };
      expect(err.code).toMatch(/^[a-z][a-z0-9-]*$/);
    });

    it("EventMessage jenerik olay bildirimi taşır (Boss Faz 5)", () => {
      const event: EventMessage = {
        type: "event",
        eventId: "f-1:42",
        timestamp: "2026-09-07T10:00:00.000Z",
        level: "error",
        category: "app",
        eventCode: "device_alarm",
        message: "Voltage alttan sigortayi atti",
        context: { deviceId: "bsc-1" },
      };
      expect(event.eventCode).toBe("device_alarm");
      expect(event.context?.deviceId).toBe("bsc-1");
    });

    it("StreamOpenMessage akış açılışını taşır (§5.2)", () => {
      const msg: StreamOpenMessage = {
        type: "stream-open",
        streamId: 42,
        sessionId: "s-1",
        method: "GET",
        path: "/api/data/bsc-1/latest",
      };
      expectTypeOf(msg).toEqualTypeOf<StreamOpenMessage>();
    });

    it("StreamOpenMessage upgrade bayrağı WS köprüsü taşır (§5.3)", () => {
      const msg: StreamOpenMessage = {
        type: "stream-open",
        streamId: 7,
        sessionId: "s-1",
        method: "GET",
        path: "/ws/telemetry",
        upgrade: "websocket",
      };
      expect(msg.upgrade).toBe("websocket");
    });

    it("OpenSessionMessage eşlenmiş konteyner rolü taşır (§5.5)", () => {
      const msg: OpenSessionMessage = {
        type: "open-session",
        sessionId: "s-1",
        user: { id: "u-1", username: "operator", role: "guest" },
      };
      expect(msg.user.role).toBe("guest");
    });

    it("OpenSessionAckMessage konteyner JWT + süre taşır", () => {
      const msg: OpenSessionAckMessage = {
        type: "open-session-ack",
        sessionId: "s-1",
        token: "eyJ...",
        expiresInSec: 14400,
      };
      expect(msg.expiresInSec).toBeGreaterThan(0);
    });
  });

  describe("durum tipi birlikleri", () => {
    it("TunnelConnectorState 5 durumludur", () => {
      const states: TunnelConnectorState[] = [
        "offline",
        "connecting",
        "registered",
        "connected",
        "backoff",
      ];
      expect(states).toHaveLength(5);
    });

    it("TunnelOperationalConfig yalnızca iki opsiyonel alan taşır", () => {
      const cfg: TunnelOperationalConfig = {};
      expectTypeOf(cfg).toMatchTypeOf<{
        heartbeatIntervalMs?: number;
        telemetryIntervalMs?: number;
      }>();
    });

    it("PeerConnectionState transport ConnectionState'ından ayrıdır", () => {
      const states: PeerConnectionState[] = [
        "idle",
        "connected",
        "stale",
        "error",
      ];
      expectTypeOf(states[0]).not.toEqualTypeOf<"connecting">();
    });
  });
});
