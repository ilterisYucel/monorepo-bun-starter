import {
  maneuverRecordSchema,
  operationRecordSchema,
} from "@gd-monorepo/shared-types";
import type { IOperationDefinitionStore } from "@gd-monorepo/platform-commands";
import type { IAuditLog } from "../../domain/services/IAuditLog";

export type DefinitionKind = "maneuver" | "operation";

export type DefinitionWriteOutcome =
  | { status: "created"; name: string }
  | { status: "updated"; name: string }
  | { status: "deleted"; name: string }
  | { status: "invalid" }
  | { status: "already_exists" }
  | { status: "not_found" }
  | { status: "unavailable" }
  | { status: "persist_failed" };

/**
 * OperationDefinitionsUseCase — tanım CRUD (UC-3 D4).
 *
 * Sözleşme:
 * - Kayıtlar persist anında strict zod şemalarıyla doğrulanır (bozuk → `invalid`).
 * - **Audit fail-closed:** audit yazılamazsa işlem REDDEDİLİR (`persist_failed`).
 * - Store yoksa `unavailable`; mevcut kayıt → `already_exists`; yok → `not_found`.
 */
export class OperationDefinitionsUseCase {
  constructor(
    private readonly defs: IOperationDefinitionStore | undefined,
    private readonly audit: IAuditLog,
  ) {}

  async create(
    kind: DefinitionKind,
    body: unknown,
    updatedBy: string,
  ): Promise<DefinitionWriteOutcome> {
    if (!this.defs) return { status: "unavailable" };
    const parsed = this.schema(kind).safeParse(body);
    if (!parsed.success) return { status: "invalid" };
    const name = (parsed.data as { name: string }).name;
    try {
      await this.auditFailClosed("operation_definition_created", {
        kind,
        name,
        updatedBy,
      });
      await this.defs.create(kind, parsed.data, updatedBy);
    } catch (error) {
      return String(error).includes("already_exists")
        ? { status: "already_exists" }
        : { status: "persist_failed" };
    }
    return { status: "created", name };
  }

  async update(
    kind: DefinitionKind,
    name: string,
    body: unknown,
    updatedBy: string,
  ): Promise<DefinitionWriteOutcome> {
    if (!this.defs) return { status: "unavailable" };
    const parsed = this.schema(kind).safeParse(body);
    if (!parsed.success || (parsed.data as { name: string }).name !== name) {
      return { status: "invalid" };
    }
    try {
      await this.auditFailClosed("operation_definition_updated", {
        kind,
        name,
        updatedBy,
      });
      await this.defs.update(kind, name, parsed.data, updatedBy);
    } catch {
      return { status: "persist_failed" };
    }
    return { status: "updated", name };
  }

  async disable(
    kind: DefinitionKind,
    name: string,
    updatedBy: string,
  ): Promise<DefinitionWriteOutcome> {
    if (!this.defs) return { status: "unavailable" };
    try {
      await this.auditFailClosed("operation_definition_deleted", {
        kind,
        name,
        updatedBy,
      });
      await this.defs.setEnabled(kind, name, false, updatedBy);
    } catch (error) {
      return String(error).includes("not_found")
        ? { status: "not_found" }
        : { status: "persist_failed" };
    }
    return { status: "deleted", name };
  }

  private schema(kind: DefinitionKind) {
    return kind === "maneuver" ? maneuverRecordSchema : operationRecordSchema;
  }

  private async auditFailClosed(
    eventCode:
      | "operation_definition_created"
      | "operation_definition_updated"
      | "operation_definition_deleted",
    context: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.log({
      level: "info",
      category: "audit",
      eventCode,
      message: eventCode,
      context,
    });
  }
}
