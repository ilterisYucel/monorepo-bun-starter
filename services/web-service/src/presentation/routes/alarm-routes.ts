import type { FastifyInstance } from "fastify";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import type { User, DeviceAlarmState, AlarmSeverity } from "@gd-monorepo/shared-types";


interface AlarmRow {
  device_id: string;
  alarm_name: string;
  severity: string;
  description: string | null;
  active: boolean;
  started_at: string | null;
  ended_at: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  last_changed_at: string;
}

function toState(row: AlarmRow): DeviceAlarmState {
  return {
    deviceId: row.device_id,
    alarmName: row.alarm_name,
    severity: row.severity as AlarmSeverity,
    description: row.description ?? undefined,
    active: row.active,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    resolved: row.resolved,
    resolvedBy: row.resolved_by ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    lastChangedAt: row.last_changed_at,
  };
}

/**
 * Alarm routes (Faz 0 eki) — `/api/unified/alarms`:
 * - GET: aktif (çözülmemiş önce) + son kapananlar.
 * - POST /resolve: admin/teknik; audit ÖNCE loglanır (fail-closed) —
 *   denetim kaydı yazılamazsa çözme işlemi DB'ye gitmez.
 */
export async function alarmRoutes(
  fastify: FastifyInstance,
  deps: { postgres: ISqlDatabase; logger: TamperLogger },
): Promise<void> {
  const { postgres, logger } = deps;

  fastify.get("/alarms", async (_request, reply) => {
    const [activeRows, endedRows] = await Promise.all([
      postgres.query<AlarmRow>(
        `SELECT * FROM device_alarms
         WHERE active = TRUE
         ORDER BY resolved ASC, started_at DESC NULLS LAST`,
      ),
      postgres.query<AlarmRow>(
        `SELECT * FROM device_alarms
         WHERE active = FALSE AND ended_at IS NOT NULL
         ORDER BY ended_at DESC
         LIMIT 20`,
      ),
    ]);
    return reply.send({
      alarms: [...activeRows.map(toState), ...endedRows.map(toState)],
    });
  });

  fastify.post("/alarms/resolve", async (request, reply) => {
    const user = (request as unknown as { user: User }).user;
    if (user.role !== "admin" && user.role !== "teknik") {
      return reply
        .status(403)
        .send({ error: "Alarm cozme yetkiniz yok" });
    }

    const { deviceId, alarmName } = request.body as {
      deviceId?: string;
      alarmName?: string;
    };
    if (typeof deviceId !== "string" || deviceId.length === 0 ||
        typeof alarmName !== "string" || alarmName.length === 0) {
      return reply
        .status(400)
        .send({ error: "deviceId ve alarmName gerekli" });
    }

    // Fail-closed: audit kaydı tutulamazsa çözme işlemi reddedilir (NIS-2).
    try {
      await logger.log({
        level: "info",
        category: "audit",
        eventCode: "alarm_resolved",
        message: "Cihaz alarmi cozuldu isaretlendi",
        context: { deviceId, alarmName, resolvedBy: user.username },
      });
    } catch {
      return reply
        .status(500)
        .send({ error: "Denetim kaydi tutulamadi" });
    }

    const row = await postgres.queryOne<{ alarm_name: string }>(
      `UPDATE device_alarms
       SET resolved = TRUE, resolved_by = $3, resolved_at = NOW(), last_changed_at = NOW()
       WHERE device_id = $1 AND alarm_name = $2 AND active = TRUE
       RETURNING alarm_name`,
      [deviceId, alarmName, user.username],
    );
    if (!row) {
      return reply
        .status(409)
        .send({ error: "Aktif alarm bulunamadi" });
    }

    return reply.send({ resolved: true, deviceId, alarmName });
  });
}
