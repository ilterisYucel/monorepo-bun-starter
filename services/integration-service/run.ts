import {
  RedisConnection,
  BullMQAdapter,
  PostgresAdapter,
} from "@gd-monorepo/core";
import {
  ConfigLoader,
  EnvSource,
  ALL_CONFIG_DEFINITIONS,
} from "@gd-monorepo/shared-utils";
import {
  DirectoryPluginSource,
  JsonFilePluginConfigSource,
  PluginContextFactory,
  PluginLoader,
  PluginRegistry,
  StaticPluginSource,
} from "@gd-monorepo/plugin-sdk";
import type { PluginContext } from "@gd-monorepo/plugin-sdk";
import { plugin as epiasMarketPrices } from "@gd-monorepo/epias-market-prices";
import { IntegrationService } from "./src/integration-service";
import { ExternalSeriesWriter } from "./src/external-series-writer";

async function main() {
  console.log("[run] Integration Service baslatiliyor...");

  // Konfigürasyon yukleme (oncelik: process.env > varsayilan)
  const config = new ConfigLoader(ALL_CONFIG_DEFINITIONS, [new EnvSource()]);
  config.load();
  console.log("[run] Konfigurasyon:", config.redacted());

  // Redis + BullMQ
  const redis = new RedisConnection({
    host: config.get<string>("redis.host"),
    port: config.get<number>("redis.port"),
    password: config.get<string | undefined>("redis.password"),
    db: config.get<number | undefined>("redis.db"),
  });
  const mq = new BullMQAdapter(redis);

  // TimescaleDB — external_series tablosu icin
  const postgres = new PostgresAdapter({
    host: config.get<string>("timescale.host"),
    port: config.get<number>("timescale.port"),
    user: config.get<string>("timescale.user"),
    password: config.get<string>("timescale.password"),
    database: config.get<string>("timescale.database"),
    maxConnections: config.get<number>("timescale.maxConnections"),
  });
  await postgres.connect();
  const writer = new ExternalSeriesWriter(postgres);
  await writer.init();

  // Plugin yukleme: statik (workspace paketleri) + runtime dizin (musteri pluginleri)
  const registry = new PluginRegistry<PluginContext>();
  const loader = new PluginLoader(registry, [
    new StaticPluginSource([epiasMarketPrices]),
    new DirectoryPluginSource(config.get<string>("integration.pluginDir")),
  ]);
  await loader.load();

  const contextFactory = new PluginContextFactory(
    new JsonFilePluginConfigSource(config.get<string>("integration.configDir")),
    config.get<string>("integration.stateDir"),
  );

  const service = new IntegrationService(registry, contextFactory, mq, writer);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[run] ${signal} alindi, kapatiliyor...`);
    await service.stop();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await service.start();
  console.log("[run] Hazir. FETCH_EXTERNAL job'lari bekleniyor...");
}

main().catch((err) => {
  console.error("[run] Kritik hata:", err);
  process.exit(1);
});
