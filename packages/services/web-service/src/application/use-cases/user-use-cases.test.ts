import { describe, it, expect, beforeEach, vi } from "vitest";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository";
import * as useCaseModule from "./delete-user-use-case";
import { CreateUserUseCase } from "./create-user-use-case";
import type { IPasswordHasher } from "../../../domain/services/IPasswordHasher";

function mockRepo(overrides?: Partial<IUserRepository>): IUserRepository {
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
  };
}

function mockHasher(): IPasswordHasher {
  return {
    hash: vi.fn().mockResolvedValue("hashed-pw-xyz"),
    verify: vi.fn().mockResolvedValue(true),
  };
}

describe("DeleteUserUseCase", () => {
  let repo: IUserRepository;

  beforeEach(() => {
    repo = mockRepo();
  });

  it("deletes user when id is different from current user", async () => {
    const uc = new useCaseModule.DeleteUserUseCase(repo);
    const result = await uc.execute("user-2", "user-1");
    expect(result.isSuccess).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith("user-2");
  });

  it("fails when trying to delete self", async () => {
    const uc = new useCaseModule.DeleteUserUseCase(repo);
    const result = await uc.execute("user-1", "user-1");
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe("Kendinizi silemezsiniz");
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

describe("CreateUserUseCase", () => {
  it("creates user when username is available", async () => {
    const repo = mockRepo();
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (repo.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "new-1",
      username: "newuser",
      role: "teknik",
      name: "New User",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    const hasher = mockHasher();
    const uc = new CreateUserUseCase(repo, hasher);

    const result = await uc.execute({
      username: "newuser",
      password: "secret123",
      role: "teknik",
      name: "New User",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value?.username).toBe("newuser");
    expect(hasher.hash).toHaveBeenCalledWith("secret123");
    expect(repo.create).toHaveBeenCalledWith(
      "newuser",
      "hashed-pw-xyz",
      "teknik",
      "New User",
    );
  });

  it("fails when username already exists", async () => {
    const repo = mockRepo();
    (repo.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing",
      username: "admin",
      role: "admin",
      name: "Admin",
      createdAt: "",
      updatedAt: "",
    });
    const uc = new CreateUserUseCase(repo, mockHasher());

    const result = await uc.execute({
      username: "admin",
      password: "x",
      role: "guest",
      name: "X",
    });

    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe("Bu kullanici adi zaten kullaniliyor");
  });
});
