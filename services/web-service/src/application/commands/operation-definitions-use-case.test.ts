import { describe, it, expect, vi } from "vitest";
import type { IOperationDefinitionStore } from "@gd-monorepo/platform-commands";
import type { IAuditLog } from "../../domain/services/IAuditLog";
import { OperationDefinitionsUseCase } from "./operation-definitions-use-case";

const VALID = {
  name: "pcs_charge",
  label: "PCS Şarj",
  mode: "parallel",
  steps: [{ deviceTypes: ["pcs"], command: "charge" }],
};

function makeDefs(impl?: () => Promise<void>): IOperationDefinitionStore {
  return {
    create: vi.fn(impl ?? (async () => undefined)),
    update: vi.fn(async () => undefined),
    setEnabled: vi.fn(async () => undefined),
    listByKind: vi.fn(async () => []),
  } as unknown as IOperationDefinitionStore;
}

function makeAudit(impl?: () => Promise<void>): IAuditLog {
  return { log: vi.fn(impl ?? (async () => undefined)) };
}

describe("OperationDefinitionsUseCase", () => {
  it("geçerli tanımı oluşturur + audit yazar", async () => {
    const defs = makeDefs();
    const audit = makeAudit();
    const outcome = await new OperationDefinitionsUseCase(defs, audit).create(
      "maneuver",
      VALID,
      "admin",
    );
    expect(outcome).toEqual({ status: "created", name: "pcs_charge" });
    expect(defs.create).toHaveBeenCalledWith("maneuver", VALID, "admin");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_definition_created" }),
    );
  });

  it("audit fail-closed: audit hatası → persist_failed, store'a YAZILMAZ", async () => {
    const defs = makeDefs();
    const audit = makeAudit(async () => {
      throw new Error("audit down");
    });
    const outcome = await new OperationDefinitionsUseCase(defs, audit).create(
      "maneuver",
      VALID,
      "admin",
    );
    expect(outcome).toEqual({ status: "persist_failed" });
    expect(defs.create).not.toHaveBeenCalled();
  });

  it("mevcut tanım → already_exists", async () => {
    const defs = makeDefs(async () => {
      throw new Error("already_exists");
    });
    const outcome = await new OperationDefinitionsUseCase(defs, makeAudit()).create(
      "maneuver",
      VALID,
      "admin",
    );
    expect(outcome).toEqual({ status: "already_exists" });
  });

  it("şema hatası → invalid (store'a yazılmaz)", async () => {
    const defs = makeDefs();
    const outcome = await new OperationDefinitionsUseCase(defs, makeAudit()).create(
      "maneuver",
      { name: "" },
      "admin",
    );
    expect(outcome).toEqual({ status: "invalid" });
    expect(defs.create).not.toHaveBeenCalled();
  });

  it("güncelleme + audit yazılır", async () => {
    const defs = makeDefs();
    const audit = makeAudit();
    const outcome = await new OperationDefinitionsUseCase(defs, audit).update(
      "maneuver",
      "pcs_charge",
      { ...VALID, label: "Yeni Etiket" },
      "admin",
    );
    expect(outcome).toEqual({ status: "updated", name: "pcs_charge" });
    expect(defs.update).toHaveBeenCalledWith(
      "maneuver",
      "pcs_charge",
      { ...VALID, label: "Yeni Etiket" },
      "admin",
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_definition_updated" }),
    );
  });

  it("güncellemede ad uyuşmazlığı → invalid (store'a yazılmaz)", async () => {
    const defs = makeDefs();
    const outcome = await new OperationDefinitionsUseCase(defs, makeAudit()).update(
      "maneuver",
      "baska_ad",
      VALID,
      "admin",
    );
    expect(outcome).toEqual({ status: "invalid" });
    expect(defs.update).not.toHaveBeenCalled();
  });

  it("güncelleme audit fail-closed: audit hatası → persist_failed, store'a YAZILMAZ", async () => {
    const defs = makeDefs();
    const audit = makeAudit(async () => {
      throw new Error("audit down");
    });
    const outcome = await new OperationDefinitionsUseCase(defs, audit).update(
      "maneuver",
      "pcs_charge",
      VALID,
      "admin",
    );
    expect(outcome).toEqual({ status: "persist_failed" });
    expect(defs.update).not.toHaveBeenCalled();
  });

  it("devre dışı bırakma → deleted + audit", async () => {
    const defs = makeDefs();
    const audit = makeAudit();
    const outcome = await new OperationDefinitionsUseCase(defs, audit).disable(
      "operation",
      "x",
      "admin",
    );
    expect(outcome).toEqual({ status: "deleted", name: "x" });
    expect(defs.setEnabled).toHaveBeenCalledWith("operation", "x", false, "admin");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "operation_definition_deleted" }),
    );
  });

  it("devre dışı bırakmada bulunamayan kayıt → not_found", async () => {
    const defs = makeDefs();
    defs.setEnabled = vi.fn(async () => {
      throw new Error("not_found");
    });
    const outcome = await new OperationDefinitionsUseCase(defs, makeAudit()).disable(
      "maneuver",
      "yok",
      "admin",
    );
    expect(outcome).toEqual({ status: "not_found" });
  });

  it("devre dışı bırakma audit fail-closed: audit hatası → persist_failed, store'a YAZILMAZ", async () => {
    const defs = makeDefs();
    const audit = makeAudit(async () => {
      throw new Error("audit down");
    });
    const outcome = await new OperationDefinitionsUseCase(defs, audit).disable(
      "maneuver",
      "pcs_charge",
      "admin",
    );
    expect(outcome).toEqual({ status: "persist_failed" });
    expect(defs.setEnabled).not.toHaveBeenCalled();
  });
});
