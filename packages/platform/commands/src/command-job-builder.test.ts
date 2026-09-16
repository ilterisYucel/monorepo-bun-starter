import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CommandJobBuilder } from "./command-job-builder";
import type {
  CommandResolutionCode,
  CommandResolutionError,
} from "./command-job-builder";
import { DeviceConfigFileSource } from "./device-config-source";
import type { DeviceConfigFile, CommandConfig } from "@gd-monorepo/shared-types";

/**
 * CommandJobBuilder sözleşmesi (MANAGEMENT-SERVICE-MIMARISI.md T2, §7):
 *
 * - `build(deviceId, commandName, params?)` → `Result<CommandDeviceJob,
 *   CommandResolutionError>` — beklenen hatalar Result ile taşınır, throw YOK.
 * - Hata kodları (reason): `device_not_found` (config yok), `command_not_found`
 *   (komut tanımsız), `missing_param` (required param verilmemiş).
 * - `{{param}}` çözümü: TAM eşleşme `^([+-]?)\{\{(\w+)\}\}$` — sayısal parametreye
 *   `-` öneki negatif uygular; şablon olmayan değer AYNEN taşınır (raw).
 * - atomic: config'de belirtilmemişse `true`; belirtilmişse config değeri.
 * - validate eşlemesi: `reads` birebir; `timeoutMs` = config `timeoutMs ?? 3000`;
 *   `minWaitMs` birebir. validate yoksa job.validate undefined.
 * - jobId: `${deviceId}-${commandName}-${now().getTime()}` — determinizm için
 *   `now` constructor'a enjekte edilir.
 * - Telemetri çıktısı: her girdiye `timestamp` (now ISO) + `deviceId` + boş
 *   `description` eklenir (web-service command-routes davranışının birebir
 *   taşınmış halidir — K9: refactor davranış değiştirmez).
 *
 * Yan etkiler: YOK (job üretimi saftır; kuyruğa ekleme tüketicidedir).
 */

const FIXED_DATE = new Date("2026-09-15T10:00:00.000Z");

const bscConfig: DeviceConfigFile = {
  deviceId: "bsc-1",
  name: "BSC 1",
  manufacturer: "LG",
  model: "BSC",
  protocol: "MODBUS",
  type: "bsc",
  connection: { host: "127.0.0.1" },
  telemetry: [],
  commands: {
    charge: {
      label: "Şarj",
      telemetries: [
        { name: "Command Request", value: 2 },
        { name: "Charge Power Setpoint", value: "{{powerKw}}" },
        { name: "Mode Signed", value: "-{{powerKw}}" },
        { name: "Raw Text", value: "hello" },
      ],
      params: {
        powerKw: { type: "number", min: 0, max: 3568, required: true },
        note: { type: "string", required: false },
      },
      atomic: true,
      timeoutMs: 2500,
      validate: {
        minWaitMs: 100,
        reads: [{ name: "Request Acknowledge", expect: 2 }],
      },
    },
    stop: {
      telemetries: [{ name: "Command Request", value: 1 }],
      atomic: false,
    },
  },
};

const memorySource = {
  load(deviceId: string): DeviceConfigFile | undefined {
    return deviceId === bscConfig.deviceId ? bscConfig : undefined;
  },
};

function builder(): CommandJobBuilder {
  return new CommandJobBuilder({
    source: memorySource,
    now: () => FIXED_DATE,
  });
}

describe("CommandJobBuilder.build", () => {
  it("config yok → err device_not_found", () => {
    const r = builder().build("bsc-99", "stop");
    expect(r.isErr()).toBe(true);
    expect((r.error() as CommandResolutionError).reason).toBe<
      CommandResolutionCode
    >("device_not_found");
  });

  it("komut tanımsız → err command_not_found", () => {
    const r = builder().build("bsc-1", "turbo");
    expect(r.isErr()).toBe(true);
    expect((r.error() as CommandResolutionError).reason).toBe<
      CommandResolutionCode
    >("command_not_found");
  });

  it("zorunlu param eksik → err missing_param (context.paramName taşır)", () => {
    const r = builder().build("bsc-1", "charge", {});
    expect(r.isErr()).toBe(true);
    expect((r.error() as CommandResolutionError).reason).toBe<
      CommandResolutionCode
    >("missing_param");
    expect((r.error() as CommandResolutionError).context.paramName).toBe(
      "powerKw",
    );
  });

  it("zorunlu olmayan param eksik → ok", () => {
    const r = builder().build("bsc-1", "charge", { powerKw: 50 });
    expect(r.isOk()).toBe(true);
  });

  it("{{param}} sayısal çözülür; -{{param}} negatif uygular; şablon olmayan aynen kalır", () => {
    const r = builder().build("bsc-1", "charge", { powerKw: 50 });
    expect(r.isOk()).toBe(true);
    const job = r.unwrap();
    const byName = Object.fromEntries(job.telemetries.map((t) => [t.name, t.value]));
    expect(byName["Command Request"]).toBe(2);
    expect(byName["Charge Power Setpoint"]).toBe(50);
    expect(byName["Mode Signed"]).toBe(-50);
    expect(byName["Raw Text"]).toBe("hello");
  });

  it("atomic belirtilmemişse true; false belirtilmişse false", () => {
    const charge = builder().build("bsc-1", "charge", { powerKw: 50 });
    expect(charge.unwrap().atomic).toBe(true);
    const stop = builder().build("bsc-1", "stop");
    expect(stop.unwrap().atomic).toBe(false);
  });

  it("validate eşlemesi: reads + timeoutMs + minWaitMs", () => {
    const job = builder().build("bsc-1", "charge", { powerKw: 50 }).unwrap();
    expect(job.validate).toEqual({
      minWaitMs: 100,
      timeoutMs: 2500,
      reads: [{ name: "Request Acknowledge", expect: 2 }],
    });
  });

  it("validate yoksa job.validate undefined; timeoutMs defaultu yalnızca validate ile birlikte anlamlı", () => {
    const job = builder().build("bsc-1", "stop").unwrap();
    expect(job.validate).toBeUndefined();
  });

  it("jobId formatı: deviceId-command-timestamp (enjekte now)", () => {
    const job = builder().build("bsc-1", "stop").unwrap();
    expect(job.jobId).toBe(`bsc-1-stop-${FIXED_DATE.getTime()}`);
  });

  it("telemetri çıktısına timestamp + deviceId + description eklenir", () => {
    const job = builder().build("bsc-1", "stop").unwrap();
    expect(job.telemetries).toHaveLength(1);
    const t = job.telemetries[0]!;
    expect(t.timestamp).toBe(FIXED_DATE.toISOString());
    expect(t.deviceId).toBe("bsc-1");
    expect(t.description).toBe("");
  });

  it("job type COMMAND_DEVICE ve deviceId doğru", () => {
    const job = builder().build("bsc-1", "stop").unwrap();
    expect(job.type).toBe("COMMAND_DEVICE");
    expect(job.deviceId).toBe("bsc-1");
  });
});

describe("DeviceConfigFileSource", () => {
  it("mevcut dosyayı yükler", () => {
    const dir = mkdtempSync(join(tmpdir(), "cmd-src-XXXXXX"));
    writeFileSync(join(dir, "bsc-1.json"), JSON.stringify(bscConfig));
    const source = new DeviceConfigFileSource(dir);
    expect(source.load("bsc-1")?.deviceId).toBe("bsc-1");
  });

  it("olmayan cihaz → undefined", () => {
    const dir = mkdtempSync(join(tmpdir(), "cmd-src-XXXXXX"));
    const source = new DeviceConfigFileSource(dir);
    expect(source.load("bsc-9")).toBeUndefined();
  });

  it("büyük/küçük harf uyumlu arama: önce lowercase, sonra orijinal", () => {
    const dir = mkdtempSync(join(tmpdir(), "cmd-src-XXXXXX"));
    writeFileSync(join(dir, "PCS-1.json"), JSON.stringify({ ...bscConfig, deviceId: "PCS-1" }));
    const source = new DeviceConfigFileSource(dir);
    expect(source.load("PCS-1")?.deviceId).toBe("PCS-1");
  });

  it("bozuk JSON atlanır → undefined", () => {
    const dir = mkdtempSync(join(tmpdir(), "cmd-src-XXXXXX"));
    writeFileSync(join(dir, "bad-1.json"), "{ bozuk");
    const source = new DeviceConfigFileSource(dir);
    expect(source.load("bad-1")).toBeUndefined();
  });
});
