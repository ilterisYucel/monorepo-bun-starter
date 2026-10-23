import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { AuditLogEntry, IAuditLog } from "../../domain/services/IAuditLog";

/**
 * TamperLoggerAdapter — `IAuditLog` portunun somut adaptörü (infrastructure).
 *
 * SPEC WEB-SERVICE-KATMANLAMA K12: use-case'ler TamperLogger'ı doğrudan
 * import etmez; DI bu adaptörü bağlar. Davranış birebir (imzalı zincir).
 */
export class TamperLoggerAdapter implements IAuditLog {
  constructor(private readonly logger: TamperLogger) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.logger.log(entry);
  }
}
