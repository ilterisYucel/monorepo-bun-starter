import type { IOperationRunStore } from "@gd-monorepo/platform-commands";

/** OperationRunsUseCase — koşu sorguları (UC-3 D3). */
export class OperationRunsUseCase {
  constructor(private readonly runs: IOperationRunStore) {}

  listRecent(limit = 20) {
    return this.runs.listRecent(limit);
  }

  find(id: string) {
    return this.runs.findById(id);
  }
}
