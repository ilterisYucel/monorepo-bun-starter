import { describe, it, expect, vi } from "vitest";
import { SetupAgent, shouldStartSetup } from "./setup-server";
import type { AgentConfig } from "./config";

const FORM = {
  hubUrl: "http://hub.local:5003",
  peerId: "revpi-1",
  serviceId: "revpi-dashboard",
  localTarget: "https://127.0.0.1:41443",
  authMode: "token" as const,
  token: "peer-token-1",
  tlsInsecure: true,
};

function makeAgent(overrides: {
  fetchImpl?: unknown;
  writeConfig?: (config: AgentConfig) => void;
} = {}) {
  const written: AgentConfig[] = [];
  const agent = new SetupAgent({
    hostname: "revpi-1",
    configPath: "/tmp/agent.env",
    fetchImpl: (overrides.fetchImpl ?? (async () => new Response("{}", { status: 200 }))) as never,
    writeConfig:
      overrides.writeConfig ??
      ((config) => {
        written.push(config);
      }),
  });
  return { agent, written };
}

describe("shouldStartSetup", () => {
  it("AK-3.1: config yoksa setup açılır, varsa açılmaz", () => {
    expect(
      shouldStartSetup({ configExists: false, env: {}, hostname: "h" }),
    ).toBe(true);
    expect(
      shouldStartSetup({
        configExists: true,
        env: {},
        hostname: "h",
      }),
    ).toBe(false);
    expect(
      shouldStartSetup({
        configExists: false,
        env: {
          HUB_URL: "http://h:5003",
          SERVICE_ID: "s",
          LOCAL_TARGET: "http://127.0.0.1:80",
          PEER_TOKEN: "t",
        },
        hostname: "h",
      }),
    ).toBe(false);
  });
});

describe("SetupAgent", () => {
  it("AK-3.2: /test config doğrular ve hub /health çağırır", async () => {
    const fetchImpl = vi.fn(async () => new Response("{\"status\":\"ok\"}", { status: 200 }));
    const { agent } = makeAgent({ fetchImpl });
    const result = await agent.test(FORM);
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.hubReachable).toBe(true);
    const url = String((fetchImpl.mock.calls[0] as unknown as [string])[0]);
    expect(url).toBe("http://hub.local:5003/health");
  });

  it("AK-3.2: bootstrap modunda claim eder ve aynı token için tekrar claim etmez", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      String(url).endsWith("/health")
        ? new Response("{}", { status: 200 })
        : new Response(JSON.stringify({ peerId: "revpi-1", peerSecret: "peer-secret-9" }), {
            status: 200,
          }),
    );
    const { agent, written } = makeAgent({ fetchImpl });
    const bootstrapForm = { ...FORM, authMode: "bootstrap" as const, token: "boot-1" };

    const first = await agent.test(bootstrapForm);
    const second = await agent.test(bootstrapForm);
    expect(first.claimedPeerId).toBe("revpi-1");
    expect(second.claimedPeerId).toBe("revpi-1");
    const claimCalls = fetchImpl.mock.calls.filter((c) =>
      String((c as unknown as [string])[0]).endsWith("/peers/bootstrap/claim"),
    );
    expect(claimCalls).toHaveLength(1);

    const saved = await agent.save(bootstrapForm);
    expect(saved.ok).toBe(true);
    const config = written[0]!;
    expect(config.peerSecret).toBe("peer-secret-9");
    expect(config.bootstrapToken).toBeUndefined();
  });

  it("AK-3.3/3.4: geçerli form config yazar; eksik alan 400 döner", async () => {
    const { agent, written } = makeAgent();
    const saved = await agent.save(FORM);
    expect(saved.ok).toBe(true);
    expect(written[0]!.peerToken).toBe("peer-token-1");
    expect(written[0]!.hubSecret).toMatch(/^[0-9a-f]{64}$/);

    const invalid = await agent.save({ ...FORM, serviceId: "" });
    expect(invalid.status).toBe(400);
    expect(invalid.errors.join(" ")).toContain("SERVICE_ID");
  });

  it("AK-3.4: hub erişilemezse test hata döner", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const { agent } = makeAgent({ fetchImpl });
    const result = await agent.test(FORM);
    expect(result.ok).toBe(false);
    expect(result.hubReachable).toBe(false);
  });
});
