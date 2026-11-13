// device-service çalışma zamanı kurulumu — SPEC T-18 (R-1) kanıtı.
// AK-1.1: kurulum yalnız config + DeviceService üretir; hiçbir porta `listen` yapmaz.
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { Server as NetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IMessageQueue } from "@gd-monorepo/core";
import { buildDeviceRuntime } from "./runtime";

const dirs: string[] = [];

const makeConfigDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "dev-service-runtime-"));
  dirs.push(dir);
  writeFileSync(
    join(dir, "service.json"),
    JSON.stringify({ redis: { host: "127.0.0.1", port: 6379 }, servicePollIntervalMs: 5000 }),
  );
  writeFileSync(
    join(dir, "dev.json"),
    JSON.stringify({
      deviceId: "TEST-1",
      name: "Test",
      manufacturer: "Test",
      model: "Test",
      protocol: "MODBUS",
      connection: { host: "127.0.0.1", port: 5599, slaveId: 1 },
      telemetry: [
        {
          protocol: "MODBUS",
          name: "Reg",
          registerAddress: 0,
          registerTableType: "INPUT_REGISTER",
          registerDataType: "UINT16",
          scale: 1,
          offset: 0,
          byteOrder: "BIG_ENDIAN",
          priority: 0,
        },
      ],
    }),
  );
  return dir;
};

const fakeMq = (): IMessageQueue =>
  ({
    addJob: vi.fn(),
    registerWorker: vi.fn(),
    registerWorkerFor: vi.fn(),
    close: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
  }) as unknown as IMessageQueue;

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe("buildDeviceRuntime — AK-1.1 (port açmaz)", () => {
  it("kurulum hiçbir TCP/HTTP sunucusu dinletmez", async () => {
    // HTTP Server da net.Server'ı genişletir; tek noktadan yakalanır.
    const listen = vi.spyOn(NetServer.prototype, "listen");

    const runtime = await buildDeviceRuntime(makeConfigDir(), fakeMq(), {});

    expect(runtime.deviceCount).toBe(1);
    expect(runtime.service).toBeDefined();
    expect(listen).not.toHaveBeenCalled();
  });
});
