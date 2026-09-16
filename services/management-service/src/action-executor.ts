// ActionExecutor — ateşlenen kuralın aksiyonlarını sırayla çalıştıran,
// her aksiyonun sonucunu imzalı loga basan yürütücü.
// Kaynak tasarım: docs/architecture/MANAGEMENT-SERVICE-MIMARISI.md §7.

import type { IMessageQueue } from "@gd-monorepo/core";
import type {
  TamperLogger,
  LogLevel,
} from "@gd-monorepo/tamper-logger";
import type {
  AutomationRule,
  RuleAction,
} from "@gd-monorepo/shared-types";
import { CommandJobBuilder } from "@gd-monorepo/platform-commands";
import type { IContainerCommandChannel } from "./container-command-channel";

/** Tek aksiyonun sonucu. */
export interface ActionOutcome {
  action: RuleAction;
  ok: boolean;
  reason?: string;
}

/** ActionExecutor yapılandırması — tek obje (DI kuralı 3). */
export interface ActionExecutorConfig {
  builder: CommandJobBuilder;
  mq: IMessageQueue;
  logger?: TamperLogger;
  /** executeAndWait timeout tamponu (job timeout'una eklenir). */
  commandTimeoutBufferMs?: number;
  /** Konteyner komut kanalı (WS4 D4) — yoksa container-command aksiyonu fail. */
  containerCommands?: IContainerCommandChannel;
}

/** Komut timeout'u config'de yoksa kullanılan varsayılan. */
const DEFAULT_COMMAND_TIMEOUT_MS = 3000;
/** executeAndWait tamponu — cihaz servisinin yanıt marjı. */
const DEFAULT_COMMAND_TIMEOUT_BUFFER_MS = 2000;

/**
 * ActionExecutor — kural aksiyonlarının yürütücüsü.
 *
 * Davranış sözleşmesi (test: action-executor.test.ts, MIMARISI §7):
 * - Kural ateşlendiğinde önce `auto_rule_fired` (info) loglanır.
 * - Aksiyonlar SIRAYLA çalışır; biri başarısız olursa sonrakiler DEVAM eder
 *   (kademeli bozulma); dönüş listesi aksiyon sırasını korur.
 * - command: çözümleme hatası (beklenen) → fail; job → executeAndWait →
 *   `auto_rule_action_ok` / `auto_rule_action_failed`.
 * - log: eventCode yoksa `auto_rule_fired`; logger yoksa console fallback.
 * - notify: `auto_rule_<kural-adı>` eventCode'u ile loglanır — bildirim
 *   yönlendirmesi TamperLogger `alertRules.eventCodes` üzerinden AlertNotifier'a
 *   yapılır (Faz 6 T6.7 deseni; ActionExecutor notifier bilmez). Logger yoksa
 *   ATLANIR (ok sonuç).
 * - Beklenmeyen throw → fail sonucuna düşer, akış durmaz.
 */
export class ActionExecutor {
  private readonly builder: CommandJobBuilder;
  private readonly mq: IMessageQueue;
  private readonly logger: TamperLogger | undefined;
  private readonly bufferMs: number;
  private readonly containerCommands: IContainerCommandChannel | undefined;

  constructor(config: ActionExecutorConfig) {
    this.builder = config.builder;
    this.mq = config.mq;
    this.logger = config.logger;
    this.bufferMs = config.commandTimeoutBufferMs ?? DEFAULT_COMMAND_TIMEOUT_BUFFER_MS;
    this.containerCommands = config.containerCommands;
  }

  /** Komut — kuralın aksiyonlarını sırayla çalıştırır, sonuç listesini döner. */
  async execute(rule: AutomationRule): Promise<ActionOutcome[]> {
    await this.logFire(rule);

    const outcomes: ActionOutcome[] = [];
    await rule.then.reduce(async (prev, action) => {
      await prev;
      outcomes.push(await this.runAction(rule, action));
    }, Promise.resolve());
    return outcomes;
  }

  private async runAction(
    rule: AutomationRule,
    action: RuleAction,
  ): Promise<ActionOutcome> {
    switch (action.action) {
      case "command":
        return this.runCommand(rule, action);
      case "container-command":
        return this.runContainerCommand(rule, action);
      case "log":
        return this.runLog(rule, action);
      case "notify":
        return this.runNotify(rule);
    }
  }

  /**
   * Konteyner komutu (WS4 D4) — field web-service komut proxy'si üzerinden
   * tünelden konteynerin kendi komut hattına iletilir. Kanal yapılandırılmamışsa
   * fail (kademeli bozulma — akış durmaz).
   */
  private async runContainerCommand(
    rule: AutomationRule,
    action: Extract<RuleAction, { action: "container-command" }>,
  ): Promise<ActionOutcome> {
    const traceId = `auto:${rule.name}`;
    const context = {
      rule: rule.name,
      action: "container-command" as const,
      containerId: action.containerId,
      deviceId: action.deviceId,
      command: action.command,
      traceId,
    };

    if (!this.containerCommands) {
      const reason = "konteyner komut kanali yapilandirilmamis";
      await this.logAction("auto_rule_action_failed", "error", {
        ...context,
        reason,
      });
      return { action, ok: false, reason };
    }

    const result = await this.containerCommands.send({
      containerId: action.containerId,
      deviceId: action.deviceId,
      command: action.command,
      params: action.params,
      traceId,
    });

    if (result.ok) {
      await this.logAction("auto_rule_action_ok", "info", context);
      return { action, ok: true };
    }
    const reason = result.reason ?? "komut basarisiz";
    await this.logAction("auto_rule_action_failed", "error", {
      ...context,
      reason,
    });
    return { action, ok: false, reason };
  }

  private async runCommand(
    rule: AutomationRule,
    action: Extract<RuleAction, { action: "command" }>,
  ): Promise<ActionOutcome> {
    const context = {
      rule: rule.name,
      action: "command" as const,
      deviceId: action.deviceId,
      command: action.command,
    };

    const built = this.builder.build(action.deviceId, action.command, action.params);
    if (built.isErr()) {
      const reason = built.error().reason;
      await this.logAction("auto_rule_action_failed", "error", {
        ...context,
        reason,
      });
      return { action, ok: false, reason };
    }

    const job = built.unwrap();
    try {
      const timeoutMs =
        (job.validate?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) + this.bufferMs;
      const result = await this.mq.executeAndWait(job, timeoutMs);
      if (result.success) {
        await this.logAction("auto_rule_action_ok", "info", {
          ...context,
          jobId: job.jobId,
        });
        return { action, ok: true };
      }
      const reason = result.reason ?? "komut başarısız";
      await this.logAction("auto_rule_action_failed", "error", {
        ...context,
        reason,
      });
      return { action, ok: false, reason };
    } catch (err) {
      const reason = String(err);
      await this.logAction("auto_rule_action_failed", "error", {
        ...context,
        reason,
      });
      return { action, ok: false, reason };
    }
  }

  private async runLog(
    rule: AutomationRule,
    action: Extract<RuleAction, { action: "log" }>,
  ): Promise<ActionOutcome> {
    const eventCode = action.eventCode ?? "auto_rule_fired";
    const message =
      action.message ?? `Otomasyon kurali tetiklendi: ${rule.name}`;
    const context = { rule: rule.name, action: "log" as const };

    if (!this.logger) {
      this.consoleFallback(action.level, `[ManagementService] ${message}`);
      return { action, ok: true };
    }

    try {
      await this.logger.log({
        level: action.level,
        category: "app",
        eventCode,
        message,
        context,
      });
      return { action, ok: true };
    } catch (err) {
      return { action, ok: false, reason: String(err) };
    }
  }

  private async runNotify(
    rule: AutomationRule,
  ): Promise<ActionOutcome> {
    const action: RuleAction = { action: "notify" };
    if (!this.logger) {
      return { action, ok: true, reason: "logger yok — atlandi" };
    }

    const eventCode = `auto_rule_${rule.name}`;
    try {
      // Bildirim yönlendirmesi TamperLogger alertRules üzerinden yapılır —
      // ActionExecutor yalnızca olayı loglar (Faz 6 T6.7 deseni).
      await this.logger.log({
        level: "warn",
        category: "app",
        eventCode,
        message: `Otomasyon kurali tetiklendi: ${rule.name}`,
        context: { rule: rule.name },
      });
      return { action, ok: true };
    } catch (err) {
      const reason = String(err);
      await this.logAction("auto_rule_action_failed", "error", {
        rule: rule.name,
        action: "notify",
        reason,
      });
      return { action, ok: false, reason };
    }
  }

  /** Kural ateşleme olayı — best-effort (hata akışı durdurmaz). */
  private async logFire(rule: AutomationRule): Promise<void> {
    if (!this.logger) return;
    try {
      await this.logger.log({
        level: "info",
        category: "app",
        eventCode: "auto_rule_fired",
        message: `Otomasyon kurali tetiklendi: ${rule.name}`,
        context: { rule: rule.name, actionCount: rule.then.length },
      });
    } catch {
      // best-effort — kural aksiyonları log hatası yüzünden durmaz
    }
  }

  /** Aksiyon sonucu olayı — best-effort (hata akışı durdurmaz). */
  private async logAction(
    eventCode: "auto_rule_action_ok" | "auto_rule_action_failed",
    level: LogLevel,
    context: Record<string, unknown>,
  ): Promise<void> {
    if (!this.logger) return;
    try {
      await this.logger.log({
        level,
        category: "app",
        eventCode,
        message:
          eventCode === "auto_rule_action_ok"
            ? "Otomasyon aksiyonu basarili"
            : "Otomasyon aksiyonu basarisiz",
        context,
      });
    } catch {
      // best-effort
    }
  }

  private consoleFallback(level: "info" | "warn" | "error", message: string): void {
    if (level === "error") {
      console.error(message);
    } else if (level === "warn") {
      console.warn(message);
    } else {
      console.info(message);
    }
  }
}
