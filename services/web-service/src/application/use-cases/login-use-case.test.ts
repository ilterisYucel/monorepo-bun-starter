import { describe, it, expect, beforeEach, vi } from "vitest";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { LoginUseCase } from "./login-use-case";

/**
 * LoginUseCase T0.11 sözleşmesi (K0.3 — audit fail-closed):
 * - Başarısız giriş: `security` kanalında `login_failed` loglanır — context'te
 *   username dışında GİZLİ VERİ YOKTUR (password asla).
 * - Başarılı giriş: `audit` kanalında `login_succeeded`.
 * - Fail-closed: audit/security logu yazılamazsa giriş REDDEDİLİR
 *   (geçerli kimlik bilgisiyle bile); başarısız girişte log hatası crash etmez.
 * - Logger yoksa mevcut davranış korunur (geriye uyumluluk).
 */

function mockUserRepo(overrides?: Partial<IUserRepository>): IUserRepository {
  return {
    initialize: vi.fn(),
    findByUsername: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    passwordHashByUsername: vi.fn(),
    storeRefreshToken: vi.fn(),
    findByRefreshToken: vi.fn(),
    clearRefreshToken: vi.fn(),
    ...overrides,
  } as IUserRepository;
}

function mockTokens(overrides?: Partial<ITokenService>): ITokenService {
  return {
    signAccess: vi.fn().mockResolvedValue("access-token-xxx"),
    signRefresh: vi.fn().mockResolvedValue("refresh-token-xxx"),
    signMfa: vi.fn(),
    verifyMfa: vi.fn(),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
    ...overrides,
  };
}

function mockHasher(overrides?: Partial<IPasswordHasher>): IPasswordHasher {
  return {
    hash: vi.fn(),
    verify: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const mockUser = {
  id: "user-1",
  username: "admin",
  role: "admin" as const,
  name: "Admin User",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("LoginUseCase", () => {
  let repo: IUserRepository;
  let tokens: ITokenService;
  let hasher: IPasswordHasher;
  let useCase: LoginUseCase;

  beforeEach(() => {
    repo = mockUserRepo();
    tokens = mockTokens();
    hasher = mockHasher();
    useCase = new LoginUseCase(repo, tokens, hasher);
  });

  it("returns tokens and user on successful login", async () => {
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");

    const result = await useCase.execute({
      username: "admin",
      password: "correct-password",
    });

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual({
      accessToken: "access-token-xxx",
      refreshToken: "refresh-token-xxx",
      user: mockUser,
    });
  });

  it("fails when user is not found", async () => {
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await useCase.execute({
      username: "unknown",
      password: "any",
    });

    expect(result.isOk()).toBe(false);
    expect(result.error()).toBe("Gecersiz kullanici adi veya sifre");
  });

  it("fails when password hash is missing", async () => {
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await useCase.execute({
      username: "admin",
      password: "any",
    });

    expect(result.isOk()).toBe(false);
    expect(result.error()).toBe("Gecersiz kullanici adi veya sifre");
  });

  it("fails when password does not match", async () => {
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");
    (hasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await useCase.execute({
      username: "admin",
      password: "wrong",
    });

    expect(result.isOk()).toBe(false);
    expect(result.error()).toBe("Gecersiz kullanici adi veya sifre");
  });

  it("stores refresh token on success", async () => {
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");

    await useCase.execute({ username: "admin", password: "x" });

    expect(repo.storeRefreshToken).toHaveBeenCalledWith(
      mockUser.id,
      "refresh-token-xxx",
      expect.any(Date),
    );
  });

  it("passes the user to signAccess and signRefresh", async () => {
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");

    await useCase.execute({ username: "admin", password: "x" });

    expect(tokens.signAccess).toHaveBeenCalledWith(mockUser);
    expect(tokens.signRefresh).toHaveBeenCalledWith(mockUser);
  });

  describe("T0.11 — login güvenlik logu (K0.3 fail-closed)", () => {
    let log: ReturnType<typeof vi.fn>;

    function withLogger() {
      log = vi.fn().mockResolvedValue(undefined);
      useCase = new LoginUseCase(repo, tokens, hasher, { log } as unknown as TamperLogger);
    }

    it("başarısız giriş security kanalında login_failed loglar — password YOK", async () => {
      withLogger();
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");
      (hasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await useCase.execute({ username: "admin", password: "s3cret-pw" });

      expect(result.isOk()).toBe(false);
      expect(log).toHaveBeenCalledTimes(1);
      const input = log.mock.calls[0][0];
      expect(input.category).toBe("security");
      expect(input.eventCode).toBe("login_failed");
      expect(input.context.username).toBe("admin");
      expect(JSON.stringify(input)).not.toContain("s3cret-pw");
    });

    it("bilinmeyen kullanıcı da security login_failed loglar", async () => {
      withLogger();
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await useCase.execute({ username: "yok", password: "x" });

      const input = log.mock.calls[0][0];
      expect(input.category).toBe("security");
      expect(input.eventCode).toBe("login_failed");
    });

    it("başarılı giriş audit kanalında login_succeeded loglar", async () => {
      withLogger();
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");

      const result = await useCase.execute({ username: "admin", password: "x" });

      expect(result.isOk()).toBe(true);
      const input = log.mock.calls[0][0];
      expect(input.category).toBe("audit");
      expect(input.eventCode).toBe("login_succeeded");
      expect(input.context.username).toBe("admin");
    });

    it("fail-closed: audit sink kapalıyken geçerli giriş REDDEDİLİR", async () => {
      log = vi.fn().mockRejectedValue(new Error("audit sink down"));
      useCase = new LoginUseCase(repo, tokens, hasher, { log } as unknown as TamperLogger);
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");

      const result = await useCase.execute({ username: "admin", password: "x" });

      expect(result.isOk()).toBe(false);
      expect(tokens.signAccess).not.toHaveBeenCalled();
    });

    it("fail-closed: başarısız girişte log hatası crash etmez — yanıt yine başarısız", async () => {
      log = vi.fn().mockRejectedValue(new Error("audit sink down"));
      useCase = new LoginUseCase(repo, tokens, hasher, { log } as unknown as TamperLogger);
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await useCase.execute({ username: "yok", password: "x" });

      expect(result.isOk()).toBe(false);
    });
  });

  describe("T6.1 — MFA gerekli akış", () => {
    const mfaUser = { ...mockUser, mfaEnabled: true };

    it("MFA aktif kullanıcıda access/refresh ÜRETİLMEZ — mfaRequired + mfaToken döner", async () => {
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mfaUser);
      (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");
      (tokens.signMfa as ReturnType<typeof vi.fn>).mockResolvedValue("mfa-token-x");

      const result = await useCase.execute({ username: "admin", password: "x" });

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual({
        mfaRequired: true,
        mfaToken: "mfa-token-x",
        user: mfaUser,
      });
      expect(tokens.signAccess).not.toHaveBeenCalled();
      expect(repo.storeRefreshToken).not.toHaveBeenCalled();
    });

    it("MFA kapalı kullanıcıda normal token akışı korunur", async () => {
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");

      const result = await useCase.execute({ username: "admin", password: "x" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect("accessToken" in result.unwrap()).toBe(true);
      }
    });
  });

  describe("T6.6 — hesap kilidi", () => {
    function withThrottle(overrides?: {
      isLocked?: ReturnType<typeof vi.fn>;
      recordFailure?: ReturnType<typeof vi.fn>;
      recordSuccess?: ReturnType<typeof vi.fn>;
    }) {
      const throttle = {
        isLocked: overrides?.isLocked ?? vi.fn().mockResolvedValue(false),
        recordFailure: overrides?.recordFailure ?? vi.fn().mockResolvedValue(undefined),
        recordSuccess: overrides?.recordSuccess ?? vi.fn().mockResolvedValue(undefined),
      };
      useCase = new LoginUseCase(
        repo,
        tokens,
        hasher,
        undefined,
        throttle as never,
      );
      return throttle;
    }

    it("kilitli hesapta DOĞRU şifre de reddedilir", async () => {
      const throttle = withThrottle({
        isLocked: vi.fn().mockResolvedValue(true),
      });
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");

      const result = await useCase.execute({ username: "admin", password: "x" });

      expect(result.isOk()).toBe(false);
      expect(result.error()).toBe("Hesap gecici kilitli");
      expect(throttle.recordFailure).not.toHaveBeenCalled();
      expect(tokens.signAccess).not.toHaveBeenCalled();
    });

    it("eşik geçişinde login_locked security logu atılır (tek sefer)", async () => {
      const log = vi.fn().mockResolvedValue(undefined);
      const throttle = {
        isLocked: vi
          .fn()
          .mockResolvedValueOnce(false) // kilit kontrolü (giriş)
          .mockResolvedValueOnce(false) // recordFailure öncesi
          .mockResolvedValueOnce(true), // recordFailure sonrası — kilit kuruldu
        recordFailure: vi.fn().mockResolvedValue(undefined),
        recordSuccess: vi.fn(),
      };
      useCase = new LoginUseCase(
        repo,
        tokens,
        hasher,
        { log } as unknown as TamperLogger,
        throttle as never,
      );
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");
      (hasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await useCase.execute({ username: "admin", password: "wrong" });

      expect(result.isOk()).toBe(false);
      const lockedLog = log.mock.calls.find(
        (call) => (call[0] as { eventCode?: string }).eventCode === "login_locked",
      );
      expect(lockedLog).toBeTruthy();
    });

    it("başarılı girişte sayaç temizlenir", async () => {
      const throttle = withThrottle();
      (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");

      await useCase.execute({ username: "admin", password: "x" });

      expect(throttle.recordSuccess).toHaveBeenCalledWith("admin");
    });
  });
});
