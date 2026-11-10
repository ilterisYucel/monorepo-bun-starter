import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  writeAgentConfigFile,
  readAgentConfigFile,
  removeInstallFiles,
  uninstallAgent,
} from "./install";

const CONFIG = {
  hubUrl: "http://hub:5003",
  peerId: "revpi-1",
  serviceId: "s",
  localTarget: "http://127.0.0.1:80",
  peerSecret: "peer-secret",
  peerType: "device",
  tlsInsecure: false,
  heartbeatIntervalMs: 1000,
  livenessTimeoutMs: 60_000,
};

function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("config-store", () => {
  it("AK-2.2: config 0600 ile yazılır ve geri okunur", () => {
    const dir = tempDir("agent-install-");
    const path = join(dir, "nested", "agent.env");
    writeAgentConfigFile(path, CONFIG);

    expect(existsSync(path)).toBe(true);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    const env = readAgentConfigFile(path);
    expect(env.PEER_SECRET).toBe("peer-secret");
    expect(readFileSync(path, "utf8")).not.toContain("BOOTSTRAP_TOKEN=");
  });

  it("AK-4.4: removeInstallFiles var olan dosyaları siler, olmayanı atlar", () => {
    const dir = tempDir("agent-remove-");
    const path = join(dir, "agent.env");
    writeAgentConfigFile(path, CONFIG);

    const removed = removeInstallFiles([path, join(dir, "yok.env")]);
    expect(removed).toEqual([path]);
    expect(existsSync(path)).toBe(false);
  });
});

describe("uninstallAgent", () => {
  it("AK-4.4: systemctl stop/disable + daemon-reload çağırır, dosyaları siler", () => {
    const dir = tempDir("agent-uninstall-");
    const unitPath = join(dir, "a.service");
    const configPath = join(dir, "a.env");
    writeFileSync(unitPath, "[Unit]\n");
    writeFileSync(configPath, "HUB_URL=x\n");
    const calls: string[][] = [];

    const result = uninstallAgent({
      name: "a",
      unitPath,
      configPath,
      runCommand: (cmd, args) => {
        calls.push([cmd, ...args]);
        return 0;
      },
    });

    expect(result.ok).toBe(true);
    expect(calls).toContainEqual(["systemctl", "stop", "a.service"]);
    expect(calls).toContainEqual(["systemctl", "disable", "a.service"]);
    expect(calls.some((c) => c[0] === "systemctl" && c[1] === "daemon-reload")).toBe(true);
    expect(existsSync(unitPath)).toBe(false);
    expect(existsSync(configPath)).toBe(false);
  });

  it("AK-4.4: systemctl hatası olsa da dosyaları temizler", () => {
    const dir = tempDir("agent-uninstall2-");
    const unitPath = join(dir, "a.service");
    writeFileSync(unitPath, "[Unit]\n");

    const result = uninstallAgent({
      name: "a",
      unitPath,
      configPath: join(dir, "yok.env"),
      runCommand: () => 1,
    });
    expect(result.ok).toBe(true);
    expect(existsSync(unitPath)).toBe(false);
  });
});
