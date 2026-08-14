import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { CommandConfig, TelemetryData } from "@gd-monorepo/shared-types";
import { loadDeviceConfig } from "../../infrastructure/config-loader";

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

function resolveTelemetries(
  command: CommandConfig,
  params: Record<string, unknown> | undefined,
  deviceId: string,
): TelemetryData[] {
  const now = new Date().toISOString();
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

function buildJob(
  deviceId: string,
  telemetries: TelemetryData[],
  command: CommandConfig | undefined,
  jobId: string,
) {
  return {
    jobId,
    type: "COMMAND_DEVICE" as const,
    deviceId,
    timestamp: new Date().toISOString(),
    telemetries,
    atomic: command?.atomic ?? true,
    validate: command?.validate ? {
      minWaitMs: command.validate.minWaitMs,
      timeoutMs: command.timeoutMs ?? 3000,
      reads: command.validate.reads.map((r) => ({ name: r.name, expect: r.expect })),
    } : undefined,
  };
}

export async function makeCommandRoutes(
  fastify: FastifyInstance,
  options: { mq: IMessageQueue; configDir: string },
) {
  const { mq, configDir } = options;

  fastify.post("/execute", async (request, reply) => {
    const body = commandStepSchema.parse(request.body);
    const { deviceId, command: commandName, telemetries: rawTelemetries, params } = body;

    let telemetries: TelemetryData[];
    let commandConfig: CommandConfig | undefined;

    if (commandName) {
      const config = loadDeviceConfig(configDir, deviceId);
      if (!config) {
        return reply.status(404).send({ error: `Device not found: ${deviceId}` });
      }
      commandConfig = config.commands?.[commandName];
      if (!commandConfig) {
        return reply.status(404).send({ error: `Command not found: ${commandName}` });
      }
      if (commandConfig.params) {
        for (const [key, paramConfig] of Object.entries(commandConfig.params)) {
          if (paramConfig.required && (!params || params[key] === undefined)) {
            return reply.status(400).send({ error: `Missing required param: ${key}` });
          }
        }
      }
      telemetries = resolveTelemetries(commandConfig, params, deviceId);
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
    const job = buildJob(deviceId, telemetries, commandConfig, jobId);
    const result = await mq.executeAndWait(job, timeoutMs);

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
        const config = loadDeviceConfig(configDir, deviceId);
        if (!config) return { deviceId, command: commandName, success: false, reason: `Device not found: ${deviceId}` };
        commandConfig = config.commands?.[commandName];
        if (!commandConfig) return { deviceId, command: commandName, success: false, reason: `Command not found: ${commandName}` };
        if (commandConfig.params) {
          for (const [key, paramConfig] of Object.entries(commandConfig.params)) {
            if (paramConfig.required && (!params || params[key] === undefined)) {
              return { deviceId, command: commandName, success: false, reason: `Missing required param: ${key}` };
            }
          }
        }
        telemetries = resolveTelemetries(commandConfig, params, deviceId);
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
      const job = buildJob(deviceId, telemetries, commandConfig, jobId);
      const result = await mq.executeAndWait(job, timeoutMs);

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
            },
            { delay: durationSeconds * 1000 },
          );
          console.log(`[CommandRoutes] Zamanli stop planlandi: ${deviceId}, ${durationSeconds}s`);
        } catch (err) {
          console.warn(`[CommandRoutes] Zamanli stop planlanamadi: ${deviceId}`, err);
        }
      }

      return { deviceId, command: commandName, ...result };
    };

    let results: Array<{ deviceId: string; command?: string; success: boolean; reason?: string }>;

    if (mode === "sequential") {
      results = [];
      for (const step of commands) {
        const r = await executeStep(step);
        results.push(r);
        if (!r.success && onFailure === "stop") break;
      }
    } else {
      const settled = await Promise.allSettled(commands.map(executeStep));
      results = settled.map((r, i) =>
        r.status === "fulfilled" ? r.value : { deviceId: commands[i]!.deviceId, command: commands[i]!.command, success: false, reason: "Internal error" },
      );
    }

    const allOk = results.every((r) => r.success);
    return reply.status(allOk ? 200 : 422).send({ results, mode });
  });

  fastify.get("/:deviceId/commands", async (request, reply) => {
    const { deviceId } = request.params as { deviceId: string };

    const config = loadDeviceConfig(configDir, deviceId);
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
