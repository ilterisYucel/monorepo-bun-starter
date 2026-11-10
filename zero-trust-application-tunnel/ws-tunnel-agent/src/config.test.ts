import { describe, it, expect } from "vitest";
import {
  parseAgentConfig,
  readEnvFile,
  mergeConfigEnv,
  serializeAgentConfig,
  maskConfig,
} from "./config";

const BASE_ENV = {
  HUB_URL: "http://hub.local:5003",
  SERVICE_ID: "revpi-dashboard",
  LOCAL_TARGET: "https://127.0.0.1:41443",
  PEER_TOKEN: "secret-token",
};

function errorsOf(env: Record<string, string>, hostname = "revpi-1"): string[] {
  const result = parseAgentConfig(env, { hostname });
  return result.isErr() ? result.error().map((e) => e.field) : [];
}

describe("parseAgentConfig", () => {
  it("AK-1.1: zorunlu alanlar eksikse alan adıyla reddeder", () => {
    expect(errorsOf({})).toEqual(
      expect.arrayContaining(["HUB_URL", "SERVICE_ID", "LOCAL_TARGET"]),
    );
    expect(errorsOf({ ...BASE_ENV, HUB_URL: "" })).toContain("HUB_URL");
  });

  it("AK-1.2: PEER_ID yoksa hostname kullanılır; kimlik alanlarından biri zorunlu", () => {
    const ok = parseAgentConfig(BASE_ENV, { hostname: "revpi-9" });
    expect(ok.isOk()).toBe(true);
    if (ok.isOk()) expect(ok.unwrap().peerId).toBe("revpi-9");

    const noIdentity = { ...BASE_ENV, PEER_TOKEN: "" };
    expect(errorsOf(noIdentity)).toContain("IDENTITY");
  });

  it("AK-1.3: http/https dışı URL reddedilir", () => {
    expect(errorsOf({ ...BASE_ENV, HUB_URL: "ftp://hub" })).toContain("HUB_URL");
    expect(errorsOf({ ...BASE_ENV, LOCAL_TARGET: "ws://x" })).toContain("LOCAL_TARGET");
  });

  it("AK-1.4: TLS_INSECURE yalnız https hedefte etkin; config show secret maskeler", () => {
    const httpTarget = parseAgentConfig(
      { ...BASE_ENV, LOCAL_TARGET: "http://127.0.0.1:8080", TLS_INSECURE: "1" },
      { hostname: "h" },
    );
    expect(httpTarget.isOk()).toBe(true);
    if (httpTarget.isOk()) expect(httpTarget.unwrap().tlsInsecure).toBe(false);

    const httpsTarget = parseAgentConfig(
      { ...BASE_ENV, TLS_INSECURE: "1" },
      { hostname: "h" },
    );
    if (httpsTarget.isOk()) expect(httpsTarget.unwrap().tlsInsecure).toBe(true);

    const masked = maskConfig(httpsTarget.unwrap());
    expect(masked).toContain("PEER_TOKEN=***");
    expect(masked).not.toContain("secret-token");
  });

  it("varsayılanlar: peerType=device, heartbeat/liveness", () => {
    const result = parseAgentConfig(BASE_ENV, { hostname: "h" });
    if (result.isOk()) {
      const config = result.unwrap();
      expect(config.peerType).toBe("device");
      expect(config.heartbeatIntervalMs).toBe(1000);
      expect(config.livenessTimeoutMs).toBe(60_000);
    }
  });
});

describe("env-file", () => {
  it("KEY=VALUE parse eder; yorum/boş satır/tırnak", () => {
    const env = readEnvFile(
      [
        "# yorum",
        "",
        "HUB_URL=http://hub:5003",
        'PEER_TOKEN="quoted"',
        "TLS_INSECURE=1",
      ].join("\n"),
    );
    expect(env.HUB_URL).toBe("http://hub:5003");
    expect(env.PEER_TOKEN).toBe("quoted");
    expect(env.TLS_INSECURE).toBe("1");
  });

  it("serialize → readEnvFile roundtrip", () => {
    const result = parseAgentConfig(BASE_ENV, { hostname: "h" });
    if (!result.isOk()) throw new Error("config");
    const text = serializeAgentConfig(result.unwrap());
    const env = readEnvFile(text);
    expect(env.HUB_URL).toBe("http://hub.local:5003");
    expect(env.PEER_TOKEN).toBe("secret-token");
  });

  it("mergeConfigEnv: env dosya üzerine yazar, secret dosyada kalır", () => {
    const merged = mergeConfigEnv(
      { HUB_URL: "http://old:5003", PEER_SECRET: "file-secret", HUB_SECRET: "file-hub" },
      { HUB_URL: "http://new:5003", BOOTSTRAP_TOKEN: "boot", PEER_SECRET: "env-secret" },
    );
    expect(merged.HUB_URL).toBe("http://new:5003");
    expect(merged.BOOTSTRAP_TOKEN).toBe("boot");
    expect(merged.PEER_SECRET).toBe("file-secret");
    expect(merged.HUB_SECRET).toBe("file-hub");
  });
});
