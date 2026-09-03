import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChangePasswordUseCase } from "./change-password-use-case";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";
import type { User } from "@gd-monorepo/shared-types";

/**
 * ChangePasswordUseCase sözleşmesi (Faz 1 T1.6):
 * - Eski şifre doğrulanmazsa Result.err — hiçbir değişiklik yapılmaz.
 * - Yeni şifre eskiyle aynıysa fail.
 * - Başarı: hash güncellenir + must_change_password=false + YENİ token'lar
 *   (eski token'da bayrak true kaldığından yeni access şarttır).
 */

const mockUser: User = {
  id: "u-1",
  username: "admin",
  role: "admin",
  name: "A",
  fieldIds: [],
  mustChangePassword: true,
  createdAt: "",
  updatedAt: "",
};

function mockRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    initialize: vi.fn(),
    findByUsername: vi.fn(),
    findById: vi.fn().mockResolvedValue(mockUser),
    usersByFieldIds: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue({ ...mockUser, mustChangePassword: false }),
    delete: vi.fn(),
    passwordHashByUsername: vi.fn().mockResolvedValue("old-hash"),
    storeRefreshToken: vi.fn(),
    findByRefreshToken: vi.fn(),
    clearRefreshToken: vi.fn(),
    ...overrides,
  };
}

function mockHasher(overrides: Partial<IPasswordHasher> = {}): IPasswordHasher {
  return {
    hash: vi.fn().mockResolvedValue("new-hash"),
    verify: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function mockTokens(overrides: Partial<ITokenService> = {}): ITokenService {
  return {
    signAccess: vi.fn().mockResolvedValue("access-new"),
    signRefresh: vi.fn().mockResolvedValue("refresh-new"),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
    ...overrides,
  };
}

describe("ChangePasswordUseCase (T1.6)", () => {
  let repo: IUserRepository;
  let hasher: IPasswordHasher;
  let tokens: ITokenService;
  let useCase: ChangePasswordUseCase;

  beforeEach(() => {
    repo = mockRepo();
    hasher = mockHasher();
    tokens = mockTokens();
    useCase = new ChangePasswordUseCase(repo, hasher, tokens);
  });

  it("kullanıcı yoksa fail", async () => {
    repo = mockRepo({ findById: vi.fn().mockResolvedValue(undefined) });
    useCase = new ChangePasswordUseCase(repo, hasher, tokens);
    const result = await useCase.execute("u-x", "old", "new-password-1");
    expect(result.isErr()).toBe(true);
  });

  it("eski şifre yanlışsa fail — hash değişmez", async () => {
    hasher = mockHasher({ verify: vi.fn().mockResolvedValue(false) });
    useCase = new ChangePasswordUseCase(repo, hasher, tokens);
    const result = await useCase.execute("u-1", "yanlis", "new-password-1");
    expect(result.isErr()).toBe(true);
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("yeni şifre eskiyle aynıysa fail", async () => {
    hasher = mockHasher({ verify: vi.fn().mockResolvedValue(true) });
    useCase = new ChangePasswordUseCase(repo, hasher, tokens);
    const result = await useCase.execute("u-1", "same-password", "same-password");
    expect(result.isErr()).toBe(true);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("başarı — hash + bayrak düşürme + yeni token'lar", async () => {
    const result = await useCase.execute("u-1", "old-pw", "new-password-1");
    expect(result.isOk()).toBe(true);

    expect(hasher.verify).toHaveBeenCalledWith("old-pw", "old-hash");
    expect(hasher.hash).toHaveBeenCalledWith("new-password-1");
    expect(repo.update).toHaveBeenCalledWith("u-1", {
      password_hash: "new-hash",
      must_change_password: false,
    });
    expect(tokens.signAccess).toHaveBeenCalled();
    expect(tokens.signRefresh).toHaveBeenCalled();
    const value = result.unwrap();
    expect(value.accessToken).toBe("access-new");
    expect(value.user.mustChangePassword).toBe(false);
  });
});
