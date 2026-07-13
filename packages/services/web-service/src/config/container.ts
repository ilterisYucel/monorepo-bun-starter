import { createContainer, asFunction, asValue } from "awilix";
import {
  PostgresAdapter,
  TimescaleDBAdapter,
  RedisConnection,
  BullMQAdapter,
  MaterializedViewManager,
} from "@gd-monorepo/core";
import type { RedisConfig } from "@gd-monorepo/core";
import {
  authConfig,
  serverConfig,
  postgresConfig,
  seedUsers,
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
import { WebServiceServer } from "../presentation/server";

function redisConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
  };
}

export function buildContainer() {
  const container = createContainer();

  container.register({
    authCfg: asValue(authConfig()),
    serverCfg: asValue(serverConfig()),
    pgCfg: asValue(postgresConfig()),
    redisCfg: asValue(redisConfig()),
    seed: asValue(seedUsers()),

    postgres: asFunction(({ pgCfg }) => new PostgresAdapter(pgCfg)).singleton(),
    timescale: asFunction(
      ({ pgCfg }) => new TimescaleDBAdapter(pgCfg),
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
