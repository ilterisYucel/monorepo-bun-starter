import type {
  ExecuteOptions,
  OperationExecutor,
  OperationRunResult,
} from "@gd-monorepo/platform-commands";

/** Senkron bekleme üst sınırı (KURAL-MOTORU-V2 §3.2) — aşarsa "timeout". */
export const EXECUTE_TIMEOUT_MS = 15_000;

export type ExecuteCommandOutcome = OperationRunResult | "timeout";

export interface ExecuteCommandInput {
  kind: "maneuver" | "operation";
  name: string;
  params: Record<string, unknown>;
  deviceIds?: string[];
  /** Uzak adım hedefleri — ilki `remoteSystem` olarak kullanılır (UC-13). */
  systems?: string[];
  timer?: { durationSeconds: number };
  trigger: string;
  createdBy: string;
  traceId?: string;
}

/**
 * ExecuteCommandUseCase — manevra/operasyon yürütme (UC-3).
 *
 * Sözleşme:
 * - Executor'a derlenmiş seçenekleri geçirir (`deviceIds`, `timer`,
 *   `remoteSystem`, `trigger`, `createdBy`, `traceId`).
 * - 15 sn içinde terminal sonuç gelmezse `"timeout"` döner; yürütme arka planda
 *   sürer (executor kendi kalıcılığını yönetir).
 * - Executor hatası yutulmaz (çağıran HTTP eşlemesini yapar).
 */
export class ExecuteCommandUseCase {
  constructor(private readonly executor: OperationExecutor) {}

  async execute(input: ExecuteCommandInput): Promise<ExecuteCommandOutcome> {
    const options: ExecuteOptions = {
      ...(input.deviceIds !== undefined ? { deviceIds: input.deviceIds } : {}),
      ...(input.timer !== undefined ? { timer: input.timer } : {}),
      ...(input.systems !== undefined && input.systems.length > 0
        ? { remoteSystem: input.systems[0] }
        : {}),
      trigger: input.trigger,
      createdBy: input.createdBy,
      ...(input.traceId !== undefined ? { traceId: input.traceId } : {}),
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), EXECUTE_TIMEOUT_MS);
    });
    try {
      return await Promise.race([
        this.executor.execute(input.kind, input.name, input.params, options),
        timeout,
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
