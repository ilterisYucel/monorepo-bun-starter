import { describe, it, expect, vi } from "vitest";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { ITotpService } from "../../domain/services/ITotpService";
import type { ITotpThrottle } from "../../domain/services/ITotpThrottle";
import { MfaLoginUseCase } from "./mfa-login-use-case";

/**
 * MfaLoginUseCase (T6.1) sözleşmesi:
 * - mfa token doğrulanır (type/süre) — geçersizse fail.
 * - Kod önce TOTP ile, sonra TEK KULLANIMLIK kurtarma kodu ile denenir.
 * - TOTP başarılıysa kurtarma kodu TÜKETİLMEZ; kurtarma kodu başarılıysa yanar
 *   (ikinci kullanım reddedilir).
 * - Başarısız kod: `security` kanalında `mfa_login_failed` (username bağlamı) —
 *   log hatası başarısız girişi crash etmez (logLoginSafe).
 * - Başarı: yeni access + refresh token'lar + user döner.
 */

function mockRepo(overrides?: Partial<IUserRepository>): IUserRepository {
  return {
    initialize: vi.fn(),
    findByUsername: vi.fn(),
    findById: vi.fn().mockResolvedValue({
      id: "u-1",
      username: "admin",
      role: "admin",
      name: "Admin",
      mfaEnabled: true,
      createdAt: "",
      updatedAt: "",
    }),
    usersByFieldIds: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    passwordHashByUsername: vi.fn(),
    storeRefreshToken: vi.fn(),
    findByRefreshToken: vi.fn(),
    clearRefreshToken: vi.fn(),
    totpSecretByUserId: vi.fn().mockResolvedValue("SECRET123"),
    setTotpSecret: vi.fn(),
    enableMfa: vi.fn(),
    disableMfa: vi.fn(),
    storeRecoveryCodes: vi.fn(),
    consumeRecoveryCode: vi.fn().mockResolvedValue(false),
    ...overrides,
  } as IUserRepository;
}

function mockTokens(overrides?: Partial<ITokenService>): ITokenService {
  return {
    signAccess: vi.fn().mockResolvedValue("access-x"),
    signRefresh: vi.fn().mockResolvedValue("refresh-x"),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
    signMfa: vi.fn(),
    verifyMfa: vi.fn().mockResolvedValue({ sub: "u-1" }),
    ...overrides,
  };
}

function mockTotp(overrides?: Partial<ITotpService>): ITotpService {
  return {
    generateSecret: vi.fn().mockReturnValue("SECRET123"),
    otpauthUri: vi.fn().mockReturnValue("otpauth://totp/x"),
    isCodeValid: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

const logOk = vi.fn().mockResolvedValue(undefined);
const logger = { log: logOk } as never;

function makeCase(overrides?: {
  repo?: Partial<IUserRepository>;
  tokens?: Partial<ITokenService>;
  totp?: Partial<ITotpService>;
  throttle?: Partial<ITotpThrottle>;
}) {
  return new MfaLoginUseCase(
    mockRepo(overrides?.repo),
    mockTokens(overrides?.tokens),
    mockTotp(overrides?.totp),
    logger,
    overrides?.throttle as ITotpThrottle | undefined,
  );
}

describe("MfaLoginUseCase (T6.1)", () => {
  it("geçerli TOTP kodu ile token üretir", async () => {
    const useCase = makeCase();
    const result = await useCase.execute({ mfaToken: "mfa-tok", code: "123456" });
    expect(result.isErr()).toBe(false);
    if (!result.isErr()) {
      expect(result.unwrap().accessToken).toBe("access-x");
      expect(result.unwrap().user.id).toBe("u-1");
    }
  });

  it("mfa token geçersizse fail — TOTP denenmez", async () => {
    const verifyMfa = vi.fn().mockRejectedValue(new Error("süresi doldu"));
    const isCodeValid = vi.fn();
    const useCase = makeCase({
      tokens: { verifyMfa },
      totp: { isCodeValid },
    });
    const result = await useCase.execute({ mfaToken: "eski", code: "123456" });
    expect(result.isErr()).toBe(true);
    expect(isCodeValid).not.toHaveBeenCalled();
  });

  it("TOTP geçersizse kurtarma kodu dener; başarılı kurtarma yanar", async () => {
    const consumeRecoveryCode = vi.fn().mockResolvedValue(true);
    const useCase = makeCase({
      totp: { isCodeValid: vi.fn().mockReturnValue(false) },
      repo: { consumeRecoveryCode },
    });
    const result = await useCase.execute({ mfaToken: "mfa-tok", code: "ABCDE-12345" });
    expect(result.isErr()).toBe(false);
    expect(consumeRecoveryCode).toHaveBeenCalledTimes(1);
  });

  it("TOTP + kurtarma ikisi de geçersiz → fail + mfa_login_failed security logu", async () => {
    const useCase = makeCase({
      totp: { isCodeValid: vi.fn().mockReturnValue(false) },
      repo: { consumeRecoveryCode: vi.fn().mockResolvedValue(false) },
    });
    const result = await useCase.execute({ mfaToken: "mfa-tok", code: "999999" });
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error()).toBe("Gecersiz dogrulama kodu");
    const securityLog = logOk.mock.calls.find(
      (call) => (call[0] as { eventCode?: string }).eventCode === "mfa_login_failed",
    );
    expect(securityLog).toBeTruthy();
  });

  it("kullanıcıda TOTP sırrı yoksa fail (MFA pasif)", async () => {
    const useCase = makeCase({
      repo: { totpSecretByUserId: vi.fn().mockResolvedValue(undefined) },
    });
    const result = await useCase.execute({ mfaToken: "mfa-tok", code: "123456" });
    expect(result.isErr()).toBe(true);
  });

  it("T1.6: kilitli kullanıcıda TOTP/kurtarma DENENMEZ (brute-force koruması)", async () => {
    const isCodeValid = vi.fn();
    const consumeRecoveryCode = vi.fn();
    const useCase = makeCase({
      totp: { isCodeValid },
      repo: { consumeRecoveryCode },
      throttle: { isLocked: vi.fn().mockResolvedValue(true) },
    });
    const result = await useCase.execute({ mfaToken: "mfa-tok", code: "123456" });
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error()).toBe("MFA dogrulamasi gecici kilitli");
    expect(isCodeValid).not.toHaveBeenCalled();
    expect(consumeRecoveryCode).not.toHaveBeenCalled();
  });

  it("T1.6: başarısız kod throttle sayacını artırır", async () => {
    const recordFailure = vi.fn().mockResolvedValue(undefined);
    const useCase = makeCase({
      totp: { isCodeValid: vi.fn().mockReturnValue(false) },
      repo: { consumeRecoveryCode: vi.fn().mockResolvedValue(false) },
      throttle: { isLocked: vi.fn().mockResolvedValue(false), recordFailure },
    });
    const result = await useCase.execute({ mfaToken: "mfa-tok", code: "999999" });
    expect(result.isErr()).toBe(true);
    expect(recordFailure).toHaveBeenCalledWith("u-1");
  });

  it("T1.6: başarılı doğrulama sayacı temizler (recordSuccess)", async () => {
    const recordSuccess = vi.fn().mockResolvedValue(undefined);
    const useCase = makeCase({
      throttle: { isLocked: vi.fn().mockResolvedValue(false), recordSuccess },
    });
    const result = await useCase.execute({ mfaToken: "mfa-tok", code: "123456" });
    expect(result.isErr()).toBe(false);
    expect(recordSuccess).toHaveBeenCalledWith("u-1");
  });

  it("T1.6: throttle hatası fail-closed (doğrulama reddedilir)", async () => {
    const useCase = makeCase({
      throttle: { isLocked: vi.fn().mockRejectedValue(new Error("redis down")) },
    });
    const result = await useCase.execute({ mfaToken: "mfa-tok", code: "123456" });
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error()).toBe("MFA dogrulamasi gecici kilitli");
  });
});
