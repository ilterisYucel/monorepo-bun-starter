import { describe, it, expect, expectTypeOf } from "vitest";
import {
  FIELD_PROTOCOL_VERSION,
  DEFAULT_FIELD_OPERATIONAL_CONFIG,
  fieldOperationalConfigSchema,
  isContainerConnectionState,
} from "./messages";
import type {
  ContainerConnectionState,
  FieldConnectorState,
  FieldOperationalConfig,
  RegisterMessage,
  RegisterAckMessage,
  HeartbeatMessage,
  TelemetryMessage,
  ConfigUpdateMessage,
  ErrorMessage,
  StreamOpenMessage,
  OpenSessionMessage,
  OpenSessionAckMessage,
} from "./messages";

/**
 * T2.0 — FieldConnector kontrol kanalı sözleşmesi (TESTING.md §8.1):
 *
 * - `ContainerConnectionState` — field tarafı görünümü: "idle" (kayıtlı ama kapalı),
 *   "connected" (heartbeat akıyor), "stale" (45 sn sessizlik), "error".
 *   transport `ConnectionState`'ından AYRIDIR (tünel/telemetri transportu "stale" bilmez).
 * - `FieldConnectorState` — konteyner tarafı durum makinesi (§6 diyagramı):
 *   offline → connecting → registered → connected; connecting/connected → backoff;
 *   backoff → connecting. "backoff" = yeniden bağlanma bekleniyor.
 * - Kontrol mesajları — JSON text frame'leri (§4.1): register (ilk mesaj,
 *   protocolVersion zorunlu), register-ack (status "ok"|"rejected" + opsiyonel
 *   operational config), heartbeat (ts = gönderen saati ms), telemetry (en güncel
 *   snapshot), config-update (canlı config push — restart yok), error (kod + mesaj).
 * - `FieldOperationalConfig` — ZORUNLU alan YOK; bilinmeyen anahtarlar strip edilir
 *   (ileri uyumluluk); aralıklar 1000-300000 ms bandında tam sayı olmalı.
 * - `DEFAULT_FIELD_OPERATIONAL_CONFIG` — heartbeat 15 sn, telemetry 15 sn
 *   (tasarım §4.3: 15 sn heartbeat, 45 sn stale).
 */

describe("FieldConnector sözleşmesi (T2.0)", () => {
  describe("FIELD_PROTOCOL_VERSION", () => {
    it("1'dir — sürümlü protokol (tasarım §12.3)", () => {
      expect(FIELD_PROTOCOL_VERSION).toBe(1);
    });
  });

  describe("fieldOperationalConfigSchema", () => {
    it("tam config'i kabul eder", () => {
      const parsed = fieldOperationalConfigSchema.parse({
        heartbeatIntervalMs: 10000,
        telemetryIntervalMs: 20000,
      });
      expect(parsed).toEqual({
        heartbeatIntervalMs: 10000,
        telemetryIntervalMs: 20000,
      });
    });

    it("kısmi config'i kabul eder (yalnızca heartbeat)", () => {
      const parsed = fieldOperationalConfigSchema.parse({
        heartbeatIntervalMs: 5000,
      });
      expect(parsed.telemetryIntervalMs).toBeUndefined();
    });

    it("boş config'i kabul eder (tüm alanlar opsiyonel)", () => {
      expect(fieldOperationalConfigSchema.parse({})).toEqual({});
    });

    it("bilinmeyen anahtarları strip eder — ileri uyumluluk", () => {
      const parsed = fieldOperationalConfigSchema.parse({
        heartbeatIntervalMs: 5000,
        sessionLimit: 2,
        pathAllowlist: ["/api/*"],
      });
      expect(parsed).toEqual({ heartbeatIntervalMs: 5000 });
    });

    it("1000 ms altını reddeder", () => {
      expect(() =>
        fieldOperationalConfigSchema.parse({ heartbeatIntervalMs: 999 }),
      ).toThrow();
    });

    it("300000 ms üstünü reddeder", () => {
      expect(() =>
        fieldOperationalConfigSchema.parse({ telemetryIntervalMs: 300001 }),
      ).toThrow();
    });

    it("ondalıklı değeri reddeder", () => {
      expect(() =>
        fieldOperationalConfigSchema.parse({ heartbeatIntervalMs: 15.5 }),
      ).toThrow();
    });

    it("tip uyuşmazlığını reddeder", () => {
      expect(() =>
        fieldOperationalConfigSchema.parse({ heartbeatIntervalMs: "fast" }),
      ).toThrow();
    });
  });

  describe("DEFAULT_FIELD_OPERATIONAL_CONFIG", () => {
    it("heartbeat 15 sn — tasarım §4.3", () => {
      expect(DEFAULT_FIELD_OPERATIONAL_CONFIG.heartbeatIntervalMs).toBe(15000);
    });

    it("telemetry 15 sn", () => {
      expect(DEFAULT_FIELD_OPERATIONAL_CONFIG.telemetryIntervalMs).toBe(15000);
    });

    it("dondurulmuştur (immutable)", () => {
      expect(Object.isFrozen(DEFAULT_FIELD_OPERATIONAL_CONFIG)).toBe(true);
    });
  });

  describe("isContainerConnectionState", () => {
    it("geçerli durumları tanır", () => {
      for (const s of ["idle", "connected", "stale", "error"] as const) {
        expect(isContainerConnectionState(s)).toBe(true);
      }
    });

    it("geçersiz durumları reddeder", () => {
      expect(isContainerConnectionState("connecting")).toBe(false);
      expect(isContainerConnectionState("nope")).toBe(false);
      expect(isContainerConnectionState("")).toBe(false);
    });
  });

  describe("kontrol mesajı tipleri (discriminated union)", () => {
    it("RegisterMessage alanlarını sabitler", () => {
      const msg: RegisterMessage = {
        type: "register",
        containerId: "container-1",
        containerUrl: "http://web:80",
        protocolVersion: FIELD_PROTOCOL_VERSION,
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
    it("FieldConnectorState 5 durumludur", () => {
      const states: FieldConnectorState[] = [
        "offline",
        "connecting",
        "registered",
        "connected",
        "backoff",
      ];
      expect(states).toHaveLength(5);
    });

    it("FieldOperationalConfig yalnızca iki opsiyonel alan taşır", () => {
      const cfg: FieldOperationalConfig = {};
      expectTypeOf(cfg).toMatchTypeOf<{
        heartbeatIntervalMs?: number;
        telemetryIntervalMs?: number;
      }>();
    });

    it("ContainerConnectionState transport ConnectionState'ından ayrıdır", () => {
      const states: ContainerConnectionState[] = [
        "idle",
        "connected",
        "stale",
        "error",
      ];
      expectTypeOf(states[0]).not.toEqualTypeOf<"connecting">();
    });
  });
});
