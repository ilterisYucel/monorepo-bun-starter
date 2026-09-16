import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { IMessageQueue } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import type { CommandConfig, CommandDeviceJob, TelemetryData } from "@gd-monorepo/shared-types";

import {
  CommandJobBuilder,
  DeviceConfigFileSource,
} from "@gd-monorepo/platform-commands";
import type { IDeviceConfigSource } from "@gd-monorepo/platform-commands";

const telemetryEntrySchema = z.object({
  name: z.string().min(1),
  value: z.union([z.number(), z.string(), z.boolean()]),
  unit: z.string().default(""),
});

const commandStepSchema = z.object({
  deviceId: z.string().min(1),
  command: z.string().optional(),
  telemetries: z.array(telemetryEntrySchema).optional(),
  params: z.record(z.unknown()).optional(),
}).refine(
  (d) => d.command || (d.telemetries && d.telemetries.length > 0),
  "command or telemetries required",
);

const executeMultiSchema = z.object({
  commands: z.array(commandStepSchema).min(1),
  mode: z.enum(["parallel", "sequential"]).default("parallel"),
  onFailure: z.enum(["stop", "continue"]).default("stop"),
});

/**
 * Çapraz katman iz kimliği (WS4 D1) — tünel üzerinden gelen isteklerde
 * `x-gd-trace-id` başlığıdır; yoksa undefined (davranış değişmez).
 */
function traceFrom(request: FastifyRequest): string | undefined {
  const value = request.headers["x-gd-trace-id"];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function makeCommandRoutes(
  fastify: FastifyInstance,
  options: {
    mq: IMessageQueue;
    configDir: string;
    logger?: TamperLogger;
    /** Test enjeksiyonu — verilmezse `DeviceConfigFileSource(configDir)`. */
    configSource?: IDeviceConfigSource;
  },
) {
  const { mq, logger } = options;
  const configSource =
    options.configSource ?? new DeviceConfigFileSource(options.configDir);
  const commandJobs = new CommandJobBuilder({ source: configSource });

  fastify.post("/execute", async (request, reply) => {
    const body = commandStepSchema.parse(request.body);
    const { deviceId, command: commandName, telemetries: rawTelemetries, params } = body;

    let telemetries: TelemetryData[];
    let commandConfig: CommandConfig | undefined;
    let jobId: string;
    let jobTimestamp: string;
    let jobAtomic: boolean;
    let jobValidate: CommandDeviceJob["validate"] | undefined;

    if (commandName) {
      const config = configSource.load(deviceId);
      if (!config) {
        return reply.status(404).send({ error: `Device not found: ${deviceId}` });
      }
      commandConfig = config.commands?.[commandName];
      if (!commandConfig) {
        return reply.status(404).send({ error: `Command not found: ${commandName}` });
      }
      const result = commandJobs.build(deviceId, commandName, params);
      if (result.isErr()) {
        const err = result.error();
        return reply
          .status(400)
          .send({ error: `Missing required param: ${err.context.paramName ?? ""}` });
      }
      const job = result.unwrap();
      telemetries = job.telemetries;
      jobId = job.jobId;
      jobTimestamp = job.timestamp;
      jobAtomic = job.atomic ?? true;
      jobValidate = job.validate;
    } else {
      telemetries = rawTelemetries!.map((t) => ({
        ...t,
        timestamp: new Date().toISOString(),
        deviceId,
        description: "",
      })) as TelemetryData[];
      jobId = `${deviceId}-raw-${Date.now()}`;
      jobTimestamp = new Date().toISOString();
      jobAtomic = true;
      jobValidate = undefined;
    }

    const timeoutMs = (commandConfig?.timeoutMs ?? 3000) + 2000;
    const result = await mq.executeAndWait(
      {
        jobId,
        type: "COMMAND_DEVICE",
        deviceId,
        timestamp: jobTimestamp,
        telemetries,
        atomic: jobAtomic,
        traceId: traceFrom(request),
        ...(jobValidate ? { validate: jobValidate } : undefined),
      },
      timeoutMs,
    );

    return reply.status(result.success ? 200 : 422).send({
      deviceId,
      command: commandName,
      ...result,
    });
  });

  fastify.post("/execute-multi", async (request, reply) => {
    const { commands, mode, onFailure } = executeMultiSchema.parse(request.body);

    const executeStep = async (step: z.infer<typeof commandStepSchema>) => {
      const { deviceId, command: commandName, telemetries: rawTelemetries, params } = step;

      let telemetries: TelemetryData[];
      let commandConfig: CommandConfig | undefined;

      if (commandName) {
        const config = configSource.load(deviceId);
        if (!config) return { deviceId, command: commandName, success: false, reason: `Device not found: ${deviceId}` };
        commandConfig = config.commands?.[commandName];
        if (!commandConfig) return { deviceId, command: commandName, success: false, reason: `Command not found: ${commandName}` };
        const result = commandJobs.build(deviceId, commandName, params);
        if (result.isErr()) {
          const err = result.error();
          return {
            deviceId,
            command: commandName,
            success: false,
            reason: `Missing required param: ${err.context.paramName ?? ""}`,
          };
        }
        telemetries = result.unwrap().telemetries;
      } else {
        telemetries = rawTelemetries!.map((t) => ({
          ...t,
          timestamp: new Date().toISOString(),
          deviceId,
          description: "",
        })) as TelemetryData[];
      }

      const timeoutMs = (commandConfig?.timeoutMs ?? 3000) + 2000;
      const jobId = `${deviceId}-${commandName ?? "raw"}-${Date.now()}`;
      const result = await mq.executeAndWait(
        {
          jobId,
          type: "COMMAND_DEVICE",
          deviceId,
          timestamp: new Date().toISOString(),
          telemetries,
          atomic: commandConfig?.atomic ?? true,
          traceId: traceFrom(request),
          ...(commandConfig?.validate
            ? {
                validate: {
                  minWaitMs: commandConfig.validate.minWaitMs,
                  timeoutMs: commandConfig.timeoutMs ?? 3000,
                  reads: commandConfig.validate.reads.map((r) => ({
                    name: r.name,
                    expect: r.expect,
                  })),
                },
              }
            : undefined),
        },
        timeoutMs,
      );

      // Zamanlı komut: _durationSeconds varsa, süre dolunca otomatik stop job'ı zamanla
      const durationSeconds = params && typeof params._durationSeconds === "number"
        ? params._durationSeconds
        : undefined;
      if (durationSeconds && durationSeconds > 0 && result.success) {
        const stopJobId = `${deviceId}-stop-${Date.now()}`;
        try {
          await mq.addJob(
            {
              jobId: stopJobId,
              type: "COMMAND_DEVICE" as const,
              deviceId,
              timestamp: new Date().toISOString(),
              telemetries: [{
                name: "Request",
                value: "Stop (timer)",
                unit: "",
                timestamp: new Date().toISOString(),
                deviceId,
                description: `${durationSeconds}s timer sonucu otomatik durdurma`,
              }] as any,
              atomic: true,
              traceId: traceFrom(request),
            },
            { delay: durationSeconds * 1000 },
          );
          await logTimerSchedule(deviceId, durationSeconds, true);
        } catch (err) {
          await logTimerSchedule(deviceId, durationSeconds, false, err);
        }
      }

      return { deviceId, command: commandName, ...result };
    };

    let results: Array<{ deviceId: string; command?: string; success: boolean; reason?: string }>;

    if (mode === "sequential") {
      // Sıralı yürütme: reduce ile promise zinciri — for...of + await YASAK
      // (AGENTS async-loop kuralı); onFailure=stop kalan adımları atlar.
      results = [];
      await commands.reduce(async (prev, step) => {
        await prev;
        const stopped = results.some((r) => !r.success) && onFailure === "stop";
        if (stopped) return;
        const r = await executeStep(step);
        results.push(r);
      }, Promise.resolve());
    } else {
      const settled = await Promise.allSettled(commands.map(executeStep));
      results = settled.map((r, i) =>
        r.status === "fulfilled" ? r.value : { deviceId: commands[i]!.deviceId, command: commands[i]!.command, success: false, reason: "Internal error" },
      );
    }

    const allOk = results.every((r) => r.success);
    return reply.status(allOk ? 200 : 422).send({ results, mode });
  });

  /**
   * Zamanlı stop planlama audit'i (T0.11) — logger yoksa console bilgi
   * çıktısı (geriye uyumluluk). Audit fail-closed değildir: komut zaten
   * yürütülmüş durumdadır; planlama best-effort'tur.
   */
  async function logTimerSchedule(
    deviceId: string,
    timerSeconds: number,
    success: boolean,
    err?: unknown,
  ): Promise<void> {
    if (!logger) {
      if (success) {
        console.log(`[CommandRoutes] Zamanli stop planlandi: ${deviceId}, ${timerSeconds}s`);
      } else {
        console.warn(`[CommandRoutes] Zamanli stop planlanamadi: ${deviceId}`, err);
      }
      return;
    }
    try {
      await logger.log({
        level: success ? "info" : "error",
        category: "audit",
        eventCode: success ? "command_executed" : "command_rejected",
        message: success
          ? "Zamanlı durdurma planlandı"
          : "Zamanlı durdurma planlanamadı",
        context: {
          deviceId,
          timerSeconds,
          phase: "schedule",
          ...(err !== undefined ? { error: String(err) } : {}),
        },
      });
    } catch {
      // audit başarısız olsa da komut akışı bozulmaz
    }
  }

  fastify.get("/:deviceId/commands", async (request, reply) => {
    const { deviceId } = request.params as { deviceId: string };

    const config = configSource.load(deviceId);
    if (!config || !config.commands) {
      return reply.send({ commands: [] });
    }

    const commands = Object.entries(config.commands).map(([name, cmd]) => ({
      name,
      label: cmd.label ?? name,
      params: cmd.params ?? {},
    }));

    return reply.send({ commands });
  });
}
