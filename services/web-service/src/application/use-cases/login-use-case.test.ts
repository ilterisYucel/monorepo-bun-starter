import { describe, it, expect, beforeEach, vi } from "vitest";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";
import { LoginUseCase } from "./login-use-case";

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

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({
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

    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe("Gecersiz kullanici adi veya sifre");
  });

  it("fails when password hash is missing", async () => {
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await useCase.execute({
      username: "admin",
      password: "any",
    });

    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe("Gecersiz kullanici adi veya sifre");
  });

  it("fails when password does not match", async () => {
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (repo.passwordHashByUsername as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-pw");
    (hasher.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await useCase.execute({
      username: "admin",
      password: "wrong",
    });

    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe("Gecersiz kullanici adi veya sifre");
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
});
