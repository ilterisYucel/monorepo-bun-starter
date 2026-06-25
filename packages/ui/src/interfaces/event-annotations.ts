import type { LogEntry } from "@gd-monorepo/shared-types";

/**
 * Olay/arıza anotasyonları için arayüz.
 * TelemetryChart bu provider üzerinden dikey dashed çizgileri gösterir.
 * UI paketi tamamen API'den bağımsızdır — bu kontratı implemente eden
 * herhangi bir veri kaynağı kullanılabilir.
 */
export interface EventAnnotationsProvider {
  annotations: LogEntry[];
  isLoading: boolean;
}
