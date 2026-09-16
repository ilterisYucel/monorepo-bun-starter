// CommandJobBuilder — device config komut tanımını COMMAND_DEVICE job'ına
// çeviren jenerik çözümleyici. Kaynak tasarım: MANAGEMENT-SERVICE-MIMARISI.md
// T2; davranış web-service command-routes'tan birebir taşınmıştır (K9).

import { ValidationError, Result } from "@gd-monorepo/result";
import type {
  CommandConfig,
  CommandDeviceJob,
  TelemetryData,
} from "@gd-monorepo/shared-types";
import type { IDeviceConfigSource } from "./device-config-source";

/** Çözümleme hata sebebi — ActionExecutor'ın karar alması için taşınır. */
export type CommandResolutionCode =
  | "device_not_found"
  | "command_not_found"
  | "missing_param";

/**
 * CommandResolutionError — beklenen komut çözümleme hatası; Result ile
 * taşınır, throw EDİLMEZ. `reason` alanı makine-okunur ayrımı taşır;
 * `context` ek ayrıntı taşır (ör. `missing_param` için `paramName`).
 */
export class CommandResolutionError extends ValidationError {
  readonly reason: CommandResolutionCode;
  override readonly context: Record<string, unknown>;

  constructor(
    reason: CommandResolutionCode,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(`command.${reason}`, message, { context });
    this.reason = reason;
    this.context = context ?? {};
  }
}

/** CommandJobBuilder yapılandırması — tek obje (DI kuralı 3). */
export interface CommandJobBuilderConfig {
  source: IDeviceConfigSource;
  /** Zaman kaynağı — deterministik test için enjekte edilir (varsayılan sistem saati). */
  now?: () => Date;
}

/** Varsayılan komut timeout'u — config'de belirtilmemişse (command-routes birebir). */
const DEFAULT_COMMAND_TIMEOUT_MS = 3000;

/**
 * CommandJobBuilder — `{deviceId, command, params?}` üçlüsünü
 * `COMMAND_DEVICE` job'ına çevirir.
 *
 * Davranış sözleşmesi (test: command-job-builder.test.ts):
 * - Config yok → `err(device_not_found)`; komut yok → `err(command_not_found)`;
 *   `required` param eksik → `err(missing_param)`.
 * - `{{param}}` TAM eşleşme şablonu çözülür; `-{{param}}` sayısal parametreye
 *   negatif uygular; şablon olmayan değer AYNEN taşınır.
 * - `atomic` config'de yoksa `true`.
 * - `validate`: `reads` birebir; `timeoutMs` = config `timeoutMs ?? 3000`;
 *   `minWaitMs` birebir; validate yoksa job.validate undefined.
 * - jobId: `${deviceId}-${commandName}-${now.getTime()}`.
 * - Yan etki YOK — kuyruğa ekleme tüketicinin sorumluluğudur.
 */
export class CommandJobBuilder {
  private readonly source: IDeviceConfigSource;
  private readonly now: () => Date;

  constructor(config: CommandJobBuilderConfig) {
    this.source = config.source;
    this.now = config.now ?? (() => new Date());
  }

  build(
    deviceId: string,
    commandName: string,
    params?: Record<string, unknown>,
  ): Result<CommandDeviceJob, CommandResolutionError> {
    const config = this.source.load(deviceId);
    if (!config) {
      return Result.err(
        new CommandResolutionError(
          "device_not_found",
          `Cihaz bulunamadi: ${deviceId}`,
        ),
      );
    }

    const command = config.commands?.[commandName];
    if (!command) {
      return Result.err(
        new CommandResolutionError(
          "command_not_found",
          `Komut bulunamadi: ${deviceId}.${commandName}`,
        ),
      );
    }

    if (command.params) {
      for (const [key, paramConfig] of Object.entries(command.params)) {
        if (paramConfig.required && (!params || params[key] === undefined)) {
          return Result.err(
            new CommandResolutionError(
              "missing_param",
              `Zorunlu parametre eksik: ${key}`,
              { paramName: key },
            ),
          );
        }
      }
    }

    const telemetries = this.resolveTelemetries(command, params, deviceId);
    const now = this.now();
    const job: CommandDeviceJob = {
      jobId: `${deviceId}-${commandName}-${now.getTime()}`,
      type: "COMMAND_DEVICE",
      deviceId,
      timestamp: now.toISOString(),
      telemetries,
      atomic: command.atomic ?? true,
      ...(command.validate
        ? {
            validate: {
              minWaitMs: command.validate.minWaitMs,
              timeoutMs: command.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
              reads: command.validate.reads.map((r) => ({
                name: r.name,
                expect: r.expect,
              })),
            },
          }
        : undefined),
    };
    return Result.ok(job);
  }

  private resolveTelemetries(
    command: CommandConfig,
    params: Record<string, unknown> | undefined,
    deviceId: string,
  ): TelemetryData[] {
    const now = this.now().toISOString();
    return command.telemetries.map((t) => {
      let resolvedValue: unknown = t.value;

      if (typeof resolvedValue === "string") {
        const match = resolvedValue.match(/^([+-]?)\{\{(\w+)\}\}$/);
        if (match) {
          const paramName = match[2]!;
          const param = params?.[paramName];
          // İşaret öneki: PCS setpoint'leri için (+ deşarj, − şarj)
          if (match[1] === "-" && typeof param === "number") {
            resolvedValue = -param;
          } else {
            resolvedValue = param;
          }
        }
      }

      return {
        name: t.name,
        value: resolvedValue as number | string | boolean,
        unit: t.unit ?? "",
        description: "",
        timestamp: now,
        deviceId,
      } as TelemetryData;
    });
  }
}
