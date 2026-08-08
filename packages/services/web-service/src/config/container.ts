import { createContainer, asFunction, asValue } from "awilix";
import {
  PostgresAdapter,
  TimescaleDBAdapter,
  RedisConnection,
  BullMQAdapter,
  MaterializedViewManager,
} from "@gd-monorepo/core";
import {
  createConfigLoader,
  authConfig,
  serverConfig,
  postgresConfig,
  timescaleDBConfig,
  redisConfig,
  seedUsers,
  serviceTier,
} from "./default";
import { LoginUseCase } from "../application/use-cases/login-use-case";
import { RefreshTokenUseCase } from "../application/use-cases/refresh-token-use-case";
import { LogoutUseCase } from "../application/use-cases/logout-use-case";
import { CreateUserUseCase } from "../application/use-cases/create-user-use-case";
import { UpdateUserUseCase } from "../application/use-cases/update-user-use-case";
import { DeleteUserUseCase } from "../application/use-cases/delete-user-use-case";
import { ListUsersUseCase } from "../application/use-cases/list-users-use-case";
import { TokenAdapter } from "../infrastructure/auth/token-adapter";
import { UserRepository } from "../infrastructure/persistence/user-repository";
import { BunPasswordHasher } from "../infrastructure/auth/bun-password-hasher";
import { RealtimeManager } from "../infrastructure/realtime/realtime-manager";
import { ContainerProxy } from "../infrastructure/container-proxy/container-proxy";
import { FieldPoller } from "../infrastructure/field-poller";
import { WebServiceServer } from "../presentation/server";

export function buildContainer() {
  const container = createContainer();

  container.register({
    config: asValue(createConfigLoader()),

    // Config degerleri — ConfigLoader'dan turetilir
    authCfg: asFunction(({ config }) => authConfig(config)).singleton(),
    serverCfg: asFunction(({ config }) => serverConfig(config)).singleton(),
    pgCfg: asFunction(({ config }) => postgresConfig(config)).singleton(),
    tsCfg: asFunction(({ config }) => timescaleDBConfig(config)).singleton(),
    redisCfg: asFunction(({ config }) => redisConfig(config)).singleton(),
    seed: asValue(seedUsers()),

    // Altyapi adapter'lari
    postgres: asFunction(({ pgCfg }) => new PostgresAdapter(pgCfg)).singleton(),
    timescale: asFunction(
      ({ tsCfg }) => new TimescaleDBAdapter(tsCfg),
    ).singleton(),

    redis: asFunction(
      ({ redisCfg }) => new RedisConnection(redisCfg),
    ).singleton(),

    mq: asFunction(
      ({ redis }) => new BullMQAdapter(redis),
    ).singleton(),

    mvManager: asFunction(
      ({ timescale }) => new MaterializedViewManager(timescale),
    ).singleton(),

    realtime: asFunction(
      ({ redis }) => new RealtimeManager(redis),
    ).singleton(),

    // Tier-aware servisler
    containerProxy: asFunction(({ config }) => {
      const tier = serviceTier(config);
      if (tier === "field") return new ContainerProxy();
      return undefined;
    }).singleton(),

    fieldPoller: asFunction(
      ({ postgres, config }) => {
        const tier = serviceTier(config);
        if (tier === "boss") return new FieldPoller(postgres);
        return undefined;
      },
    ).singleton(),

    // Repository ve Use-Case'ler
    userRepo: asFunction(
      ({ postgres }) => new UserRepository(postgres),
    ).singleton(),
    tokens: asFunction(
      ({ authCfg }) => new TokenAdapter(authCfg),
    ).singleton(),
    hasher: asFunction(() => new BunPasswordHasher()).singleton(),

    loginUseCase: asFunction(
      ({ userRepo, tokens, hasher }) =>
        new LoginUseCase(userRepo, tokens, hasher),
    ).singleton(),
    refreshTokenUseCase: asFunction(
      ({ userRepo, tokens }) =>
        new RefreshTokenUseCase(userRepo, tokens),
    ).singleton(),
    logoutUseCase: asFunction(
      ({ userRepo }) => new LogoutUseCase(userRepo),
    ).singleton(),
    createUserUseCase: asFunction(
      ({ userRepo, hasher }) => new CreateUserUseCase(userRepo, hasher),
    ).singleton(),
    updateUserUseCase: asFunction(
      ({ userRepo, hasher }) => new UpdateUserUseCase(userRepo, hasher),
    ).singleton(),
    deleteUserUseCase: asFunction(
      ({ userRepo }) => new DeleteUserUseCase(userRepo),
    ).singleton(),
    listUsersUseCase: asFunction(
      ({ userRepo }) => new ListUsersUseCase(userRepo),
    ).singleton(),

    server: asFunction(
      ({ serverCfg }) => new WebServiceServer(serverCfg),
    ).singleton(),
  });

  return container;
}
