export type {
  ConfigDefinition,
  ConfigSource,
  ConfigChangeEvent,
  ConfigChangeHandler,
  ConfigValues,
  ConfigUnit,
} from "./types";

export { applyUnit } from "./units";

export {
  EnvSource,
  DotenvSource,
  JsonFileSource,
  YamlFileSource,
  ObjectSource,
} from "./sources";

export {
  ALL_CONFIG_DEFINITIONS,
  serverPort,
  serverHost,
  authJwtSecret,
  authAccessTokenExpirySeconds,
  authRefreshTokenExpirySeconds,
  redisHost,
  redisPort,
  redisPassword,
  redisDb,
  postgresHost,
  postgresPort,
  postgresUser,
  postgresPassword,
  postgresDatabase,
  postgresPoolSize,
  timescaleHost,
  timescalePort,
  timescaleUser,
  timescalePassword,
  timescaleDatabase,
  timescaleChunkInterval,
  timescaleCompressAfter,
  timescaleRetentionAfter,
  timescaleStatementTimeoutMs,
  timescaleIdleTimeoutMs,
  timescaleConnectionTimeoutMs,
  timescalePoolSize,
  serviceTier,
  deviceConfigDir,
  servicePollIntervalMs,
  workerConcurrency,
  managementIntervalMs,
  logLevel,
  logSigningKeyPath,
  logFilePath,
  integrationPluginDir,
  integrationConfigDir,
  integrationStateDir,
  i18nDefaultLocale,
  i18nAvailableLocales,
} from "./definitions";

export { ConfigLoader } from "./loader";
