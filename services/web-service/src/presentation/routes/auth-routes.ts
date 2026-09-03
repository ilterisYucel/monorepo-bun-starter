import type { FastifyInstance } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { ServerDependencies } from "../server";
import { MFA_LOCKED_MESSAGE } from "../../application/use-cases/mfa-login-use-case";
import {
  LoginRequestSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  RefreshRequestSchema,
  ChangePasswordRequestSchema,
  MfaLoginRequestSchema,
  MfaEnrollConfirmRequestSchema,
} from "../../domain/validation/auth-schemas";

/** Faz 6 T6.6 — hesap kilidi mesajı: bu mesaj için 429 dönülür. */
const LOCKED_MESSAGE = "Hesap gecici kilitli";

export async function makeAuthRoutes(
  fastify: FastifyInstance,
  deps: ServerDependencies,
) {
  // Faz 4 T4.4 — oturum doğrulama (tünel modu hydrate'i):
  // rbac hook'u kimliği zaten çözmüştür (Bearer VEYA container_session
  // cookie'si — konteyner tier'da sessionAuthenticator). Bu route yalnızca
  // çözümlenmiş kullanıcıyı + tünel bayrağını döner; kimliği çözülmemiş
  // istek buraya hiç ulaşmaz (rbac 401 döner).
  fastify.get("/session", async (request, reply) => {
    const user = (request as unknown as { user?: User }).user;
    if (!user) {
      return reply.status(401).send({ error: "Oturum yok" });
    }
    const cookie = request.headers.cookie ?? "";
    const tunnel = cookie.includes("container_session=");
    return reply.send({ user, tunnel });
  });

  fastify.post("/login", async (request, reply) => {
    const parsed = LoginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await deps.loginUseCase.execute(parsed.data);
    if (result.isErr()) {
      // Faz 6 T6.6: hesap kilidi ayrı HTTP durumu taşır (429).
      if (result.error() === LOCKED_MESSAGE) {
        return reply.status(429).send({ error: result.error() });
      }
      return reply.status(401).send({ error: result.error() });
    }
    // 2026-08-28: etkin MFA roller listesi frontend'e taşınır — guard'lar
    // hardcoded rol yerine sunucu config'ini kullanır (MFA_ENABLED=false).
    return reply.send({
      ...result.unwrap(),
      mfaRequiredRoles: deps.mfaRequiredRoles,
    });
  });

  // Faz 6 T6.1 — MFA girişinin ikinci adımı. PUBLIC (login öneki):
  // giriş henüz tamamlanmamıştır; kimlik mfaToken'in kendisidir.
  fastify.post("/login/mfa", async (request, reply) => {
    if (!deps.mfaLoginUseCase) {
      return reply.status(404).send({ error: "MFA desteklenmiyor" });
    }
    const parsed = MfaLoginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await deps.mfaLoginUseCase.execute(parsed.data);
    if (result.isErr()) {
      // 2026-08-30 (T1.6): TOTP deneme kilidi ayrı HTTP durumu taşır (429).
      if (result.error() === MFA_LOCKED_MESSAGE) {
        return reply.status(429).send({ error: result.error() });
      }
      return reply.status(401).send({ error: result.error() });
    }
    return reply.send({ ...result.unwrap(), mfaRequiredRoles: deps.mfaRequiredRoles });
  });

  // Faz 6 T6.1 — MFA kayıt akışı (JWT gerekli; rbac MFA_ALLOWLIST).
  fastify.post("/mfa/enroll", async (request, reply) => {
    if (!deps.mfaEnrollUseCase) {
      return reply.status(404).send({ error: "MFA desteklenmiyor" });
    }
    const user = (request as unknown as { user: User }).user;
    const result = await deps.mfaEnrollUseCase.enroll(user.id);
    if (result.isErr()) {
      return reply.status(400).send({ error: result.error() });
    }
    return reply.send(result.unwrap());
  });

  fastify.post("/mfa/confirm", async (request, reply) => {
    if (!deps.mfaEnrollUseCase) {
      return reply.status(404).send({ error: "MFA desteklenmiyor" });
    }
    const parsed = MfaEnrollConfirmRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const user = (request as unknown as { user: User }).user;
    const result = await deps.mfaEnrollUseCase.confirm(user.id, parsed.data.code);
    if (result.isErr()) {
      // 2026-08-30 (T1.6): TOTP deneme kilidi ayrı HTTP durumu taşır (429).
      if (result.error() === MFA_LOCKED_MESSAGE) {
        return reply.status(429).send({ error: result.error() });
      }
      return reply.status(400).send({ error: result.error() });
    }
    return reply.send({ ...result.unwrap(), mfaRequiredRoles: deps.mfaRequiredRoles });
  });

  // Faz 6 T6.1 — admin sıfırlaması: hedef kullanıcının MFA'sını düşürür.
  fastify.post("/mfa/reset", async (request, reply) => {
    if (!deps.mfaEnrollUseCase) {
      return reply.status(404).send({ error: "MFA desteklenmiyor" });
    }
    const actor = (request as unknown as { user: User }).user;
    if (actor.role !== "admin") {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    const body = request.body as { userId?: unknown } | undefined;
    const targetUserId = body?.userId;
    if (typeof targetUserId !== "string" || targetUserId.length === 0) {
      return reply.status(400).send({ error: "userId gerekli" });
    }
    const result = await deps.mfaEnrollUseCase.reset(targetUserId);
    if (result.isErr()) {
      return reply.status(400).send({ error: result.error() });
    }
    return reply.send({ success: true });
  });

  fastify.post("/refresh", async (request, reply) => {
    const parsed = RefreshRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await deps.refreshTokenUseCase.execute(parsed.data.refreshToken);
    if (result.isErr()) {
      return reply.status(401).send({ error: result.error() });
    }
    return reply.send(result.unwrap());
  });

  fastify.post("/logout", async (request, reply) => {
    const user = (request as unknown as { user: User }).user;
    const result = await deps.logoutUseCase.execute(user.id);
    if (result.isErr()) {
      return reply.status(400).send({ error: result.error() });
    }
    return reply.send({ success: true });
  });

  // Faz 1 T1.6 — zorunlu şifre değişimi. MUST_CHANGE_ALLOWLIST'te (rbac):
  // bayrak true olan token'ların erişebildiği tek mutasyon yoludur.
  fastify.post("/change-password", async (request, reply) => {
    const parsed = ChangePasswordRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const user = (request as unknown as { user: User }).user;
    const result = await deps.changePasswordUseCase.execute(
      user.id,
      parsed.data.oldPassword,
      parsed.data.newPassword,
    );
    if (result.isErr()) {
      return reply.status(400).send({ error: result.error() });
    }
    return reply.send(result.unwrap());
  });

  fastify.get("/users", async (_request, reply) => {
    const result = await deps.listUsersUseCase.execute();
    if (result.isErr()) {
      return reply.status(400).send({ error: result.error() });
    }
    return reply.send(result.unwrap());
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
    if (result.isErr()) {
      return reply.status(400).send({ error: result.error() });
    }
    return reply.status(201).send(result.unwrap());
  });

  fastify.put("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateUserRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await deps.updateUserUseCase.execute(id, parsed.data);
    if (result.isErr()) {
      const status = result.error() === "Kullanici bulunamadi" ? 404 : 400;
      return reply.status(status).send({ error: result.error() });
    }
    return reply.send(result.unwrap());
  });

  fastify.delete("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = (request as unknown as { user: User }).user;
    const result = await deps.deleteUserUseCase.execute(id, currentUser.id);
    if (result.isErr()) {
      const status = result.error() === "Kullanici bulunamadi" ? 404 : 400;
      return reply.status(status).send({ error: result.error() });
    }
    return reply.send({ success: true });
  });
}
