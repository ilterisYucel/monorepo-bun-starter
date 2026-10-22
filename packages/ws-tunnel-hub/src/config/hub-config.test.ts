import { describe, it, expect } from "vitest";
import { hostMapPorts, loadHubConfig } from "./hub-config";

const baseEnv = { PEER_TOKEN: "pt", CONSUMER_TOKEN: "ct" } as NodeJS.ProcessEnv;

describe("loadHubConfig HUB_HOST_MAP", () => {
  it("host[:port]=peer/service kayıtlarını çözer (küçük harfe indirir)", () => {
    const config = loadHubConfig({
      ...baseEnv,
      HUB_HOST_MAP: "App.Local:5101=revpi-1/revpi-dashboard, other=revpi-2/webui",
    });
    expect(config.hostMap?.get("app.local:5101")).toEqual({
      peerId: "revpi-1",
      serviceId: "revpi-dashboard",
    });
    expect(config.hostMap?.get("other")).toEqual({
      peerId: "revpi-2",
      serviceId: "webui",
    });
  });

  it("geçersiz kayıt → açılış reddedilir", () => {
    expect(() =>
      loadHubConfig({ ...baseEnv, HUB_HOST_MAP: "app.local=tek-parca" }),
    ).toThrow(/HUB_HOST_MAP/);
  });

  it("tanımsızsa boş harita", () => {
    const config = loadHubConfig(baseEnv);
    expect(config.hostMap?.size).toBe(0);
  });
});

describe("hostMapPorts", () => {
  it("yalnızca host:port anahtarlarından port çıkarır", () => {
    const map = new Map([
      ["app.local:5101", { peerId: "p", serviceId: "s" }],
      ["plain.host", { peerId: "p", serviceId: "s" }],
      ["other:5102", { peerId: "p", serviceId: "s" }],
    ]);
    expect(hostMapPorts(map).sort()).toEqual([5101, 5102]);
  });
});

describe("loadHubConfig TLS", () => {
  it("BYO cert/key → tls (selfSigned=false)", () => {
    const config = loadHubConfig({
      ...baseEnv,
      HUB_TLS_CERT: "/c.pem",
      HUB_TLS_KEY: "/k.pem",
    });
    expect(config.tls?.certPath).toBe("/c.pem");
    expect(config.tls?.selfSigned).toBe(false);
  });

  it("HUB_TLS_ENABLED=1 (cert yok) → self-signed", () => {
    const config = loadHubConfig({ ...baseEnv, HUB_TLS_ENABLED: "1" });
    expect(config.tls?.selfSigned).toBe(true);
    expect(config.tls?.host).toBe("localhost");
  });

  it("TLS env'i yoksa tls undefined (http)", () => {
    expect(loadHubConfig(baseEnv).tls).toBeUndefined();
  });
});

describe("loadHubConfig oturum/akış ömrü", () => {
  it("varsayılanlar: 4 sa TTL, 15 dk idle, 5 dk stream idle", () => {
    const config = loadHubConfig(baseEnv);
    expect(config.sessionTtlMs).toBe(4 * 60 * 60 * 1000);
    expect(config.sessionIdleTimeoutMs).toBe(15 * 60 * 1000);
    expect(config.streamIdleTimeoutMs).toBe(5 * 60 * 1000);
  });

  it("HUB_SESSION_TTL_MS / HUB_SESSION_IDLE_MS / HUB_STREAM_IDLE_MS override", () => {
    const config = loadHubConfig({
      ...baseEnv,
      HUB_SESSION_TTL_MS: "7200000",
      HUB_SESSION_IDLE_MS: "1800000",
      HUB_STREAM_IDLE_MS: "600000",
    });
    expect(config.sessionTtlMs).toBe(7_200_000);
    expect(config.sessionIdleTimeoutMs).toBe(1_800_000);
    expect(config.streamIdleTimeoutMs).toBe(600_000);
  });

  it("geçersiz değer → açılış reddedilir", () => {
    expect(() => loadHubConfig({ ...baseEnv, HUB_SESSION_IDLE_MS: "-5" })).toThrow(
      /HUB_SESSION_IDLE_MS/,
    );
  });
});
