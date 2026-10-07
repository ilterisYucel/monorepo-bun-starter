// OperationExecutor — manevra/operasyon yürütücüsü (yerel adımlar, Faz B1).
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON-MIMARISI.md §3-§8.

import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type {
  CommandStep,
  ManeuverRecord,
  OperationRecord,
  OperationStep,
} from "@gd-monorepo/shared-types";
import { ManeuverRegistry } from "./maneuver-registry";
import type {
  ICommandChannel,
  ICommandTargetResolver,
  IOperationRunStore,
  IRemoteCommandChannel,
  OperationRunDraft,
  OperationRunResult,
  OperationRunStatus,
  OperationStepOutcome,
  ResolvedCommandStep,
} from "./operation-executor-contracts";

/** Yürütme öncesi koşul değerlendirmesi sonucu (interlock vb.). */
export type OperationPreconditionVerdict =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Eklemeli ön koşul hook'u (SPEC UC-10/K10). Tanımsızsa yürütme davranışı
 * BİREBİR korunur (Open-Closed). Hook reddederse `rejected` döner ve koşu
 * kalıcılaştırılmaz.
 */
export type OperationPrecondition = (
  kind: "maneuver" | "operation",
  name: string,
  params: Record<string, unknown>,
) => Promise<OperationPreconditionVerdict> | OperationPreconditionVerdict;

/** OperationExecutor yapılandırması — tek obje (DI kuralı 3). */
export interface OperationExecutorConfig {
  registry: ManeuverRegistry;
  targets: ICommandTargetResolver;
  channel: ICommandChannel;
  runs: IOperationRunStore;
  /** Uzak adım kanalı (Faz C) — yoksa `system` adımı kademeli fail. */
  remoteChannel?: IRemoteCommandChannel;
  /** Eklemeli ön koşul hook'u (interlock) — yoksa davranış birebir (K10). */
  preconditions?: OperationPrecondition;
  logger?: TamperLogger;
  /** Zaman kaynağı — deterministik test için enjekte edilir. */
  now?: () => Date;
  /** Koşu kimliği üretici — deterministik test için enjekte edilir. */
  generateId?: () => string;
}

/** Yürütme isteği seçenekleri (§5.1 grup kısıtı + §8 kalıcılık alanları). */
export interface ExecuteOptions {
  /** Grup kısıtı — seçici çözümleri bu listeyle KESİŞTİRİLİR (UI grup seçimi). */
  deviceIds?: string[];
  trigger?: string;
  createdBy?: string;
  traceId?: string;
  /**
   * §10 — UI "Zamanlı" kutusu: TÜM yerel ana adımlara uygulanır (kayıt
   * adımında kendi timer'ı yoksa); stop komutu varsayılan "stop".
   */
  timer?: { durationSeconds: number };
}

/** Çözümlenmiş adım + sonucu. */
interface ResolvedStepResult {
  deviceIds: string[];
  outcomes: OperationStepOutcome[];
  success: boolean;
  timers: Array<{ deviceId: string; timer: NonNullable<CommandStep["timer"]> }>;
}

const DIVIDE_TOTAL = "{{divideTotal}}";

/**
 * OperationExecutor — manevra/operasyon adımlarını yürütür.
 *
 * Davranış sözleşmesi (test: operation-executor.test.ts, KOMUT §3-§8):
 * - Kayıt yok / şablon parametresi eksik → `rejected` (yürütme YOK).
 * - `runs.begin` FAIL-CLOSED: running satırı yazılamazsa yürütme REDDEDİLİR
 *   (rejected — çapraz sistem işlem kalıcılıksız çalışmaz, §8).
 * - Adım çözümleme (§5.1): `deviceTypes` → online+müsait hedefler;
 *   `deviceIds` müsaitlik filtresinden geçer; grup kısıtı her iki çözümü
 *   KESER; `deviceId` aynen (mevcut davranış). Çözüm boş → adım BAŞARISIZ.
 * - `{{divideTotal}}`: execute params'ındaki sayısal değer, çözülen adım
 *   sayısına eşit bölünür (floor). Diğer `{{param}}` şablonları kanalın
 *   (CommandJobBuilder) işidir.
 * - mode/onFailure: `stop` ilk hata kalanları ATLAR; `continue` devam eder
 *   (sonuç failed); `rollback` başarılı adımların kompanzasyonunu çalıştırır
 *   (best-effort, sequential'de ters sıra) — sonuç rolled_back.
 * - Timer (§10): adım BAŞARILIYSA `stopCommand` (varsayılan "stop") delay ile
 *   planlanır; planlama best-effort + audit (`timer_scheduled`/
 *   `timer_schedule_failed`).
 * - Uzak adım (`system`) — `remoteChannel` YOKSA `remote_channel_not_available`
 *   (kademeli bozulma); VARSA (Faz C) kanala delege edilir.
 * - `runs.finish` best-effort: throw → `operation_state_update_failed`
 *   audit'i; sonuç yine döner (§8).
 * - Audit olayları (category audit): operation_started/completed/failed/
 *   rolled_back, rollback_step_ok/failed, timer_scheduled/timer_schedule_failed,
 *   operation_state_update_failed.
 */
export class OperationExecutor {
  private readonly registry: ManeuverRegistry;
  private readonly targets: ICommandTargetResolver;
  private readonly channel: ICommandChannel;
  private readonly runs: IOperationRunStore;
  private readonly remoteChannel: IRemoteCommandChannel | undefined;
  private readonly preconditions: OperationPrecondition | undefined;
  private readonly logger: TamperLogger | undefined;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor(config: OperationExecutorConfig) {
    this.registry = config.registry;
    this.targets = config.targets;
    this.channel = config.channel;
    this.runs = config.runs;
    this.remoteChannel = config.remoteChannel;
    this.preconditions = config.preconditions;
    this.logger = config.logger;
    this.now = config.now ?? (() => new Date());
    this.generateId = config.generateId ?? (() => crypto.randomUUID());
  }

  /** Komut — manevra veya operasyonu yürütür, koşu sonucunu döner. */
  async execute(
    kind: "maneuver" | "operation",
    name: string,
    params: Record<string, unknown> = {},
    options: ExecuteOptions = {},
  ): Promise<OperationRunResult> {
    const resolved = await this.registry.resolve(kind, name);
    if (resolved.isErr()) {
      const error = resolved.error();
      return this.rejected(
        name,
        kind,
        error.kind === "disabled" ? "disabled" : "not_found",
      );
    }
    const record = resolved.unwrap();
    if (!this.validateDivideTotal(record, params)) {
      return this.rejected(name, kind, "missing_param");
    }

    if (this.preconditions !== undefined) {
      let verdict: OperationPreconditionVerdict;
      try {
        verdict = await this.preconditions(kind, name, params);
      } catch {
        verdict = { allowed: false, reason: "precondition_error" };
      }
      if (!verdict.allowed) {
        await this.audit("operation_precondition_rejected", "warn", {
          name,
          kind,
          reason: verdict.reason,
        });
        return this.rejected(name, kind, verdict.reason);
      }
    }

    const runId = this.generateId();
    const startedAt = this.now().toISOString();
    const draft: OperationRunDraft = {
      id: runId,
      kind,
      name,
      trigger: options.trigger ?? "manual",
      createdBy: options.createdBy ?? "system",
      ...(options.traceId !== undefined ? { traceId: options.traceId } : undefined),
      startedAt,
      steps: { definition: record, params },
    };

    try {
      await this.runs.begin(draft);
    } catch {
      return this.rejected(name, kind, "run_persist_failed");
    }
    await this.audit("operation_started", "info", {
      runId,
      kind,
      name,
      trigger: draft.trigger,
      createdBy: draft.createdBy,
    });

    const defaultTimer = options.timer
      ? { durationMs: options.timer.durationSeconds * 1000 }
      : undefined;

    const { outcomes, success, rolledBack } = await this.runRecord(
      kind,
      record,
      params,
      options.deviceIds,
      defaultTimer,
    );

    const status: OperationRunStatus = rolledBack
      ? "rolled_back"
      : success
        ? "completed"
        : "failed";
    await this.audit(
      rolledBack
        ? "operation_rolled_back"
        : success
          ? "operation_completed"
          : "operation_failed",
      rolledBack ? "warn" : success ? "info" : "error",
      { runId, kind, name },
    );

    await this.finishBestEffort(runId, status, outcomes);

    return { runId, kind, name, status, outcomes };
  }

  // --------------------------------------------------------------------------
  // YÜRÜTME
  // --------------------------------------------------------------------------

  private async runRecord(
    kind: "maneuver" | "operation",
    record: ManeuverRecord | OperationRecord,
    params: Record<string, unknown>,
    group: string[] | undefined,
    defaultTimer: { durationMs: number } | undefined,
  ): Promise<{
    outcomes: OperationStepOutcome[];
    success: boolean;
    rolledBack: boolean;
  }> {
    if (kind === "maneuver") {
      const { outcomes, success, rolledBack } = await this.runManeuver(
        record as ManeuverRecord,
        params,
        group,
        defaultTimer,
      );
      return { outcomes, success, rolledBack };
    }
    return this.runOperation(record as OperationRecord, params, group, defaultTimer);
  }

  /** Manevra adım setini yürütür; onFailure rollback ise kompanzasyonu yapar. */
  private async runManeuver(
    record: ManeuverRecord,
    params: Record<string, unknown>,
    group: string[] | undefined,
    defaultTimer: { durationMs: number } | undefined = undefined,
  ): Promise<{
    outcomes: OperationStepOutcome[];
    success: boolean;
    rolledBack: boolean;
  }> {
    const { outcomes, success, succeededTargets } = await this.runStepList(
      record.steps,
      record.mode,
      record.onFailure ?? "stop",
      params,
      group,
      defaultTimer,
    );

    let rolledBack = false;
    if (!success && record.onFailure === "rollback") {
      rolledBack = true;
      await this.runRollbackSteps(record.rollbackSteps ?? [], succeededTargets, record.mode);
    }
    return { outcomes, success, rolledBack };
  }

  /** Operasyon adımlarını yürütür; üst rollback listesini yönetir. */
  private async runOperation(
    record: OperationRecord,
    params: Record<string, unknown>,
    group: string[] | undefined,
    defaultTimer: { durationMs: number } | undefined,
  ): Promise<{
    outcomes: OperationStepOutcome[];
    success: boolean;
    rolledBack: boolean;
  }> {
    const stepOutcomes: Array<{ ok: boolean; outcome: OperationStepOutcome }> = [];
    const runOne = async (step: OperationStep, index: number): Promise<void> => {
      const outcome = await this.runOperationStep(step, index, params, group, defaultTimer);
      stepOutcomes.push({ ok: outcome.success, outcome });
    };

    if (record.mode === "sequential") {
      await record.steps.reduce(async (prev, step, index) => {
        await prev;
        const stopped =
          stepOutcomes.some((r) => !r.ok) &&
          (record.onFailure ?? "stop") === "stop";
        if (stopped) return;
        await runOne(step, index);
      }, Promise.resolve());
    } else {
      await Promise.allSettled(record.steps.map((step, i) => runOne(step, i)));
    }

    const success = stepOutcomes.every((r) => r.ok);
    let rolledBack = false;
    if (!success && record.onFailure === "rollback") {
      rolledBack = true;
      await this.runOperationRollback(record, stepOutcomes);
    }
    return {
      outcomes: stepOutcomes.map((r) => r.outcome),
      success,
      rolledBack,
    };
  }

  /** Tek operasyon adımı — yerel manevra / ham zincir / uzak (B1: fail). */
  private async runOperationStep(
    step: OperationStep,
    index: number,
    params: Record<string, unknown>,
    group: string[] | undefined,
    defaultTimer: { durationMs: number } | undefined,
  ): Promise<OperationStepOutcome> {
    if ("system" in step) {
      const result = await this.runRemoteStep(
        step.system,
        step.maneuver,
        step.params ?? params,
        defaultTimer !== undefined
          ? { durationSeconds: defaultTimer.durationMs / 1000 }
          : undefined,
      );
      return {
        stepIndex: index,
        system: step.system,
        maneuver: step.maneuver,
        success: result.ok,
        ...(result.reason !== undefined ? { reason: result.reason } : {}),
      };
    }

    if ("maneuver" in step) {
      const resolved = await this.registry.resolve("maneuver", step.maneuver);
      if (resolved.isErr()) {
        return {
          stepIndex: index,
          maneuver: step.maneuver,
          success: false,
          reason: "maneuver_not_found",
        };
      }
      const maneuverParams = {
        ...params,
        ...(step.params ?? {}),
      };
      const { outcomes, success } = await this.runManeuver(
        resolved.unwrap() as ManeuverRecord,
        maneuverParams,
        group,
        defaultTimer,
      );
      return {
        stepIndex: index,
        maneuver: step.maneuver,
        success,
        ...(outcomes.some((o) => !o.success)
          ? { reason: outcomes.find((o) => !o.success)?.reason }
          : {}),
      };
    }

    // Ham komut zinciri
    const { outcomes, success } = await this.runStepList(
      step.commands,
      step.mode ?? "parallel",
      step.onFailure ?? "stop",
      { ...params, ...(step.params ?? {}) },
      group,
      defaultTimer,
    );
    return {
      stepIndex: index,
      success,
      ...(outcomes.some((o) => !o.success)
        ? { reason: outcomes.find((o) => !o.success)?.reason }
        : {}),
    };
  }

  /**
   * Adım listesini çözümler + yürütür (mode/onFailure). Dönüşte her adımın
   * çözümlenmiş hedefleri `succeededTargets`'ta (rollback girdisi — §5.1).
   */
  private async runStepList(
    steps: CommandStep[],
    mode: "parallel" | "sequential",
    onFailure: "stop" | "continue" | "rollback",
    params: Record<string, unknown>,
    group: string[] | undefined,
    defaultTimer: { durationMs: number } | undefined = undefined,
  ): Promise<{
    outcomes: OperationStepOutcome[];
    success: boolean;
    succeededTargets: string[];
  }> {
    const resolvedPerStep = await Promise.all(
      steps.map((step) => this.resolveStep(step, params, group, defaultTimer)),
    );

    const outcomes: OperationStepOutcome[] = [];
    const succeededTargets: string[] = [];

    const executeStep = async (
      step: CommandStep,
      resolvedList: ResolvedCommandStep[],
      stepIndex: number,
    ): Promise<boolean> => {
      if (resolvedList.length === 0) {
        outcomes.push({
          stepIndex,
          deviceId: undefined,
          command: step.command,
          success: false,
          reason: "no_available_targets",
        });
        return false;
      }

      const runOne = async (resolved: ResolvedCommandStep): Promise<boolean> => {
        const result = await this.channel.execute(resolved);
        outcomes.push({
          stepIndex,
          deviceId: resolved.deviceId,
          command: resolved.command,
          success: result.success,
          ...(result.reason !== undefined ? { reason: result.reason } : {}),
        });
        if (result.success) {
          succeededTargets.push(resolved.deviceId);
          await this.scheduleTimer(resolved);
        }
        return result.success;
      };

      if (mode === "parallel") {
        const settled = await Promise.allSettled(resolvedList.map(runOne));
        return settled.every((r) => r.status === "fulfilled" && r.value);
      }
      return resolvedList.reduce(async (prev, resolved) => {
        const acc = await prev;
        const ok = await runOne(resolved);
        return acc && ok;
      }, Promise.resolve(true));
    };

    if (mode === "sequential") {
      const stopEarly = onFailure === "stop";
      // AGENTS async-loop kuralı: for...of + await YASAK — reduce zinciri.
      await steps.reduce(async (prev, step, stepIndex) => {
        const acc = await prev;
        if (acc.stop) return acc;
        const ok = await executeStep(step, resolvedPerStep[stepIndex]!, stepIndex);
        return { stop: !ok && stopEarly };
      }, Promise.resolve({ stop: false }));
    } else {
      await Promise.allSettled(
        steps.map((step, stepIndex) =>
          executeStep(step, resolvedPerStep[stepIndex]!, stepIndex),
        ),
      );
    }

    return {
      outcomes,
      success: outcomes.filter((o) => !o.success).length === 0,
      succeededTargets,
    };
  }

  // --------------------------------------------------------------------------
  // ROLLBACK
  // --------------------------------------------------------------------------

  /** Manevra kompanzasyon adımları — yalnızca başarılı hedefler, best-effort. */
  private async runRollbackSteps(
    rollbackSteps: CommandStep[],
    succeededTargets: string[],
    mode: "parallel" | "sequential",
  ): Promise<void> {
    const succeeded = new Set(succeededTargets);
    const ordered = mode === "sequential" ? [...rollbackSteps].reverse() : rollbackSteps;

    const runOne = async (step: CommandStep): Promise<void> => {
      const resolved = await this.resolveStep(step, {}, undefined);
      const targets = resolved
        .map((r) => r.deviceId)
        .filter((id) => succeeded.has(id));
      // AGENTS async-loop kuralı: for...of + await YASAK — reduce zinciri.
      await targets.reduce(async (prev, target) => {
        await prev;
        const result = await this.channel.execute({
          deviceId: target,
          command: step.command,
          ...(step.telemetries !== undefined ? { telemetries: step.telemetries } : {}),
          ...(step.params !== undefined ? { params: step.params } : {}),
        });
        if (result.success) {
          await this.audit("rollback_step_ok", "info", {
            deviceId: target,
            command: step.command,
          });
        } else {
          await this.audit("rollback_step_failed", "warn", {
            deviceId: target,
            command: step.command,
            reason: result.reason,
          });
        }
      }, Promise.resolve());
    };

    if (mode === "sequential") {
      await ordered.reduce(async (prev, step) => {
        await prev;
        await runOne(step);
      }, Promise.resolve());
    } else {
      await Promise.allSettled(ordered.map(runOne));
    }
  }

  /** Operasyon üst rollback listesi — ters sıra, yalnızca başarılı adımlar. */
  private async runOperationRollback(
    record: OperationRecord,
    stepOutcomes: Array<{ ok: boolean; outcome: OperationStepOutcome }>,
  ): Promise<void> {
    const rollbackSteps = record.rollback ?? [];
    const pairs = rollbackSteps
      .map((rb, i) => ({ rb, step: stepOutcomes[i] }))
      .reverse();

    await pairs.reduce(async (prev, { rb, step }) => {
      await prev;
      if (!step || !step.ok) return;

      if ("system" in rb) {
        const result = await this.runRemoteStep(
          rb.system,
          rb.maneuver,
          rb.params ?? {},
        );
        if (result.ok) {
          await this.audit("rollback_step_ok", "info", {
            system: rb.system,
            maneuver: rb.maneuver,
          });
        } else {
          await this.audit("rollback_step_failed", "warn", {
            system: rb.system,
            maneuver: rb.maneuver,
            reason: result.reason ?? "system_unreachable",
          });
        }
        return;
      }
      if ("maneuver" in rb) {
        const resolved = await this.registry.resolve("maneuver", rb.maneuver);
        if (resolved.isOk()) {
          const { success } = await this.runManeuver(
            resolved.unwrap() as ManeuverRecord,
            rb.params ?? {},
            undefined,
          );
          if (!success) {
            await this.audit("rollback_step_failed", "warn", {
              maneuver: rb.maneuver,
              reason: "rollback_failed",
            });
          }
        }
        return;
      }
      await this.runStepList(
        rb.commands,
        rb.mode ?? "parallel",
        rb.onFailure ?? "stop",
        rb.params ?? {},
        undefined,
      );
    }, Promise.resolve());
  }

  // --------------------------------------------------------------------------
  // ÇÖZÜMLEME + TIMER + KALICILIK
  // --------------------------------------------------------------------------

  /** CommandStep → ResolvedCommandStep[] (seçici çözümleme — §5.1). */
  private async resolveStep(
    step: CommandStep,
    params: Record<string, unknown>,
    group: string[] | undefined,
    defaultTimer: { durationMs: number } | undefined = undefined,
  ): Promise<ResolvedCommandStep[]> {
    let deviceIds: string[];
    if (step.deviceId !== undefined) {
      deviceIds = [step.deviceId];
    } else if (step.deviceIds !== undefined) {
      const available = await this.targets.filterAvailable(step.deviceIds);
      deviceIds = this.intersect(available, group);
    } else {
      const available = (
        await Promise.all(
          (step.deviceTypes ?? []).map((t) => this.targets.resolveAvailable(t)),
        )
      ).flat();
      deviceIds = this.intersect(this.unique(available), group);
    }

    const resolvedParams = this.applyDivideTotal(step.params, params, deviceIds.length);

    const effectiveTimer = step.timer ?? defaultTimer;
    return deviceIds.map((deviceId) => ({
      deviceId,
      ...(step.command !== undefined ? { command: step.command } : {}),
      ...(step.telemetries !== undefined ? { telemetries: step.telemetries } : {}),
      ...(resolvedParams !== undefined ? { params: resolvedParams } : {}),
      ...(effectiveTimer !== undefined ? { timer: effectiveTimer } : {}),
    }));
  }

  /** `{{divideTotal}}` şablonunu execute params değerine göre çözer (§5.1). */
  private applyDivideTotal(
    stepParams: Record<string, unknown> | undefined,
    executeParams: Record<string, unknown>,
    count: number,
  ): Record<string, unknown> | undefined {
    if (!stepParams) return undefined;
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(stepParams)) {
      if (value === DIVIDE_TOTAL) {
        const total = executeParams[key];
        if (typeof total !== "number" || count === 0) {
          continue;
        }
        resolved[key] = Math.floor(total / count);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  /** divideTotal şablonu için gerekli param varlığını doğrular (rejected). */
  private validateDivideTotal(
    record: ManeuverRecord | OperationRecord,
    params: Record<string, unknown>,
  ): boolean {
    const stepParamsList: Array<Record<string, unknown> | undefined> = [];
    if ("steps" in record && "rollbackSteps" in record) {
      for (const step of record.steps) stepParamsList.push(step.params);
    } else {
      for (const step of (record as OperationRecord).steps) {
        if ("commands" in step) {
          for (const c of step.commands) stepParamsList.push(c.params);
        }
      }
    }
    for (const stepParams of stepParamsList) {
      for (const [key, value] of Object.entries(stepParams ?? {})) {
        if (value === DIVIDE_TOTAL && typeof params[key] !== "number") {
          return false;
        }
      }
    }
    return true;
  }

  /** Timer planlama — adım başarılıysa stopCommand delay ile (best-effort). */
  private async scheduleTimer(step: ResolvedCommandStep): Promise<void> {
    if (step.timer === undefined) return;
    const stopStep: ResolvedCommandStep = {
      deviceId: step.deviceId,
      command: step.timer.stopCommand ?? "stop",
    };
    try {
      await this.channel.schedule(stopStep, step.timer.durationMs);
      await this.audit("timer_scheduled", "info", {
        deviceId: step.deviceId,
        command: stopStep.command,
        durationMs: step.timer.durationMs,
      });
    } catch (err) {
      await this.audit("timer_schedule_failed", "error", {
        deviceId: step.deviceId,
        command: stopStep.command,
        reason: String(err),
      });
    }
  }

  /** finish best-effort — hata → operation_state_update_failed audit'i (§8). */
  private async finishBestEffort(
    runId: string,
    status: OperationRunStatus,
    outcomes: OperationStepOutcome[],
  ): Promise<void> {
    try {
      await this.runs.finish(runId, status, this.now().toISOString());
    } catch {
      await this.audit("operation_state_update_failed", "error", {
        runId,
        status,
        outcomeCount: outcomes.length,
      });
    }
  }

  /** Uzak adım — kanal YOKSA kademeli fail; VARSA delege eder (Faz C §6). */
  private async runRemoteStep(
    system: string,
    maneuver: string,
    params: Record<string, unknown>,
    timer?: { durationSeconds: number },
  ): Promise<{ ok: boolean; reason?: string }> {
    if (!this.remoteChannel) {
      return { ok: false, reason: "remote_channel_not_available" };
    }
    try {
      const result =
        timer !== undefined
          ? await this.remoteChannel.execute(system, maneuver, params, timer)
          : await this.remoteChannel.execute(system, maneuver, params);
      return result;
    } catch (err) {
      return { ok: false, reason: String(err) };
    }
  }

  private rejected(
    name: string,
    kind: "maneuver" | "operation",
    reason: string,
  ): OperationRunResult {
    return {
      runId: "",
      kind,
      name,
      status: "rejected",
      outcomes: [],
      reason,
    };
  }

  private intersect(list: string[], group: string[] | undefined): string[] {
    if (group === undefined) return list;
    const set = new Set(group);
    return list.filter((id) => set.has(id));
  }

  private unique(list: string[]): string[] {
    return [...new Set(list)];
  }

  private async audit(
    eventCode: string,
    level: "info" | "warn" | "error",
    context: Record<string, unknown>,
  ): Promise<void> {
    if (!this.logger) return;
    try {
      await this.logger.log({
        level,
        category: "audit",
        eventCode,
        message: eventCode,
        context,
      });
    } catch {
      // audit en iyi çabayla — yürütme akışı durmaz
    }
  }
}
