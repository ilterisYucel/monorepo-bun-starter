import { describe, it, expect, vi } from "vitest";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import { RefreshTokenUseCase } from "./refresh-token-use-case";

/**
 * RefreshTokenUseCase sözleşmesi (2026-09-23 — K4 + K5):
 * - verifyRefresh BAŞARISIZ (imza/süre/type) → err "Gecersiz refresh token";
 *   reuse tespiti YAPILMAZ (findByRefreshToken/store/clear çağrılmaz).
 * - İmza geçerli + hash DB'de YOK → K5 reuse tespiti: `clearRefreshToken(sub)`
 *   (fail-closed — rotasyonlanmış token yeniden sunuldu) + err.
 * - İmza geçerli + hash DB'de VAR ama kullanıcı eşleşmiyor → aynı reuse yolu.
 * - Başarı: yeni çift üretilir + `storeRefreshToken` yeni refresh token ile
 *   çağrılır (rotasyon) → ok(AuthResponse).
 * - Rotasyon sonrası eski token ile yeniden refresh → reuse → iptal (K4+K5).
 */

function mockUserRepo(overrides?: Partial<IUserRepository>): IUserRepository {
  return {
    initialize: vi.fn(),
    findByUsername: vi.fn(),
    findById: vi.fn(),
    usersByFieldIds: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    passwordHashByUsername: vi.fn(),
    storeRefreshToken: vi.fn().mockResolvedValue(undefined),
    findByRefreshToken: vi.fn().mockResolvedValue(undefined),
    clearRefreshToken: vi.fn().mockResolvedValue(undefined),
    totpSecretByUserId: vi.fn(),
    setTotpSecret: vi.fn(),
    enableMfa: vi.fn(),
    disableMfa: vi.fn(),
    storeRecoveryCodes: vi.fn(),
    consumeRecoveryCode: vi.fn(),
    ...overrides,
  } as IUserRepository;
}

function mockTokens(overrides?: Partial<ITokenService>): ITokenService {
  return {
    signAccess: vi.fn().mockResolvedValue("access-token-yeni"),
    signRefresh: vi.fn().mockResolvedValue("refresh-token-yeni"),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn().mockResolvedValue({ sub: "user-1", jti: "jti-1" }),
    signMfa: vi.fn(),
    verifyMfa: vi.fn(),
    ...overrides,
  };
}

const mockUser = {
  id: "user-1",
  username: "admin",
  role: "admin" as const,
  name: "Admin",
  fieldIds: [],
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

describe("RefreshTokenUseCase (K4 + K5 — 2026-09-23)", () => {
  it("verifyRefresh BAŞARISIZ → err; reuse tespiti YAPILMAZ (repo'ya hiç dokunulmaz)", async () => {
    const users = mockUserRepo();
    const tokens = mockTokens({
      verifyRefresh: vi.fn().mockRejectedValue(new Error("imza gecersiz")),
    });
    const uc = new RefreshTokenUseCase(users, tokens);

    const result = await uc.execute("koken-token");

    expect(result.isErr()).toBe(true);
    expect(result.error()).toBe("Gecersiz refresh token");
    expect(users.findByRefreshToken).not.toHaveBeenCalled();
    expect(users.clearRefreshToken).not.toHaveBeenCalled();
    expect(users.storeRefreshToken).not.toHaveBeenCalled();
  });

  it("imza geçerli + hash DB'de YOK → K5 reuse: clearRefreshToken(sub) + err", async () => {
    const users = mockUserRepo();
    const tokens = mockTokens({
      verifyRefresh: vi.fn().mockResolvedValue({ sub: "user-1", jti: "jti-eski" }),
    });
    const uc = new RefreshTokenUseCase(users, tokens);

    const result = await uc.execute("rotasyonlanmis-token");

    expect(result.isErr()).toBe(true);
    expect(result.error()).toBe("Gecersiz refresh token");
    expect(users.clearRefreshToken).toHaveBeenCalledTimes(1);
    expect(users.clearRefreshToken).toHaveBeenCalledWith("user-1");
    expect(users.storeRefreshToken).not.toHaveBeenCalled();
  });

  it("hash DB'de VAR ama kullanıcı eşleşmiyor → reuse yolu (clearRefreshToken)", async () => {
    const users = mockUserRepo({
      findByRefreshToken: vi.fn().mockResolvedValue({ ...mockUser, id: "baska-kullanici" }),
    });
    const tokens = mockTokens({
      verifyRefresh: vi.fn().mockResolvedValue({ sub: "user-1", jti: "jti-1" }),
    });
    const uc = new RefreshTokenUseCase(users, tokens);

    const result = await uc.execute("cakisan-token");

    expect(result.isErr()).toBe(true);
    expect(users.clearRefreshToken).toHaveBeenCalledWith("user-1");
  });

  it("başarılı refresh → yeni çift üretilir + storeRefreshToken yeni token ile (rotasyon)", async () => {
    const users = mockUserRepo({
      findByRefreshToken: vi.fn().mockResolvedValue(mockUser),
    });
    const tokens = mockTokens();
    const uc = new RefreshTokenUseCase(users, tokens);

    const result = await uc.execute("gecerli-token");

    expect(result.isOk()).toBe(true);
    const auth = result.unwrap();
    expect(auth.accessToken).toBe("access-token-yeni");
    expect(auth.refreshToken).toBe("refresh-token-yeni");
    expect(auth.user.id).toBe("user-1");
    expect(users.storeRefreshToken).toHaveBeenCalledTimes(1);
    expect(users.storeRefreshToken).toHaveBeenCalledWith(
      "user-1",
      "refresh-token-yeni",
      expect.any(Date),
    );
    expect(users.clearRefreshToken).not.toHaveBeenCalled();
  });

  it("rotasyon sonrası eski token yeniden sunulursa → reuse → iptal (K4+K5 birlikte)", async () => {
    const users = mockUserRepo({
      findByRefreshToken: vi
        .fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(undefined),
    });
    const tokens = mockTokens();
    const uc = new RefreshTokenUseCase(users, tokens);

    const ilk = await uc.execute("eski-token");
    expect(ilk.isOk()).toBe(true);

    const ikinci = await uc.execute("eski-token");
    expect(ikinci.isErr()).toBe(true);
    expect(users.clearRefreshToken).toHaveBeenCalledTimes(1);
    expect(users.clearRefreshToken).toHaveBeenCalledWith("user-1");
    expect(users.storeRefreshToken).toHaveBeenCalledTimes(1);
  });
});
