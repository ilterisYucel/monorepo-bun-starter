import type { ServiceTier } from "@gd-monorepo/shared-types";

/** Tier yaşam döngüsü — index yalnız bunları orkestre eder (K5/FR-6.1). */
export interface TierLifecycle {
  start(): Promise<void>;
  stop(): Promise<void>;
}

interface FieldProxy {
  start(): Promise<void>;
  stop(): Promise<void>;
}

interface BossCollector {
  ensureSchema(): Promise<void>;
  start(): void;
  stop(): void;
}

export interface TierCradle {
  containerProxy?: FieldProxy;
  fieldEventCollector?: BossCollector;
}

/**
 * Tier'a göre yaşam döngüsü listesi (field: konteyner görünümü; boss: olay poller'ı).
 * `serviceTier` yalnız burada ve config'de kullanılır.
 */
export function buildTierLifecycles(
  tier: ServiceTier,
  cradle: TierCradle,
): TierLifecycle[] {
  const lifecycles: TierLifecycle[] = [];

  if (tier === "field" && cradle.containerProxy) {
    const proxy = cradle.containerProxy;
    lifecycles.push({
      start: () => proxy.start(),
      stop: () => proxy.stop(),
    });
  }

  if (tier === "boss" && cradle.fieldEventCollector) {
    const collector = cradle.fieldEventCollector;
    lifecycles.push({
      start: async () => {
        await collector.ensureSchema();
        collector.start();
      },
      stop: async () => collector.stop(),
    });
  }

  return lifecycles;
}
