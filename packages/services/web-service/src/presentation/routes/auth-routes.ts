import type { FastifyInstance } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { ServerDependencies } from "../server";
import {
  LoginRequestSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  RefreshRequestSchema,
} from "../../domain/validation/auth-schemas";

export async function makeAuthRoutes(
  fastify: FastifyInstance,
  deps: ServerDependencies,
) {
  fastify.post("/login", async (request, reply) => {
    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await deps.loginUseCase.execute(parsed.data);
    if (result.isFailure) {
      return reply.status(401).send({ error: result.error });
    }
    return reply.send(result.value);
  });

  fastify.post("/refresh", async (request, reply) => {
    const parsed = RefreshRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await deps.refreshTokenUseCase.execute(parsed.data.refreshToken);
    if (result.isFailure) {
      return reply.status(401).send({ error: result.error });
    }
    return reply.send(result.value);
  });

  fastify.post("/logout", async (request, reply) => {
    const user = (request as unknown as { user: User }).user;
    const result = await deps.logoutUseCase.execute(user.id);
    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }
    return reply.send({ success: true });
  });

  fastify.get("/users", async (_request, reply) => {
    const result = await deps.listUsersUseCase.execute();
    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }
    return reply.send(result.value);
  });

  fastify.get("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await deps.userRepo.findById(id);
    if (!user) {
      return reply.status(404).send({ error: "Kullanici bulunamadi" });
    }
    return reply.send(user);
  });

  fastify.post("/users", async (request, reply) => {
    const parsed = CreateUserRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await deps.createUserUseCase.execute(parsed.data);
    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }
    return reply.status(201).send(result.value);
  });

  fastify.put("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateUserRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await deps.updateUserUseCase.execute(id, parsed.data);
    if (result.isFailure) {
      const status = result.error === "Kullanici bulunamadi" ? 404 : 400;
      return reply.status(status).send({ error: result.error });
    }
    return reply.send(result.value);
  });

  fastify.delete("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = (request as unknown as { user: User }).user;
    const result = await deps.deleteUserUseCase.execute(id, currentUser.id);
    if (result.isFailure) {
      const status = result.error === "Kullanici bulunamadi" ? 404 : 400;
      return reply.status(status).send({ error: result.error });
    }
    return reply.send({ success: true });
  });
}
