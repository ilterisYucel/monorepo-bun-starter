import { describe, it, expect, vi } from "vitest";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITotpService } from "../../domain/services/ITotpService";
import type { ITotpThrottle } from "../../domain/services/ITotpThrottle";
import { MfaEnrollUseCase } from "./mfa-enroll-use-case";

/**
 * MfaEnrollUseCase (T6.1) sözleşmesi:
 * - enroll: yeni sır üretir + saklar (MFA henüz AKTİF DEĞİL), URI döner.
 * - confirm: ilk kod doğrulanır; başarıda MFA aktifleşir + 10 tek kullanımlık
 *   kurtarma kodu döner (yalnızca BU yanıtta görünür — DB'ye hash yazılır);
 *   `mfa_enrolled` audit logu fail-closed: log yazılamazsa MFA AÇILMAZ.
 * - confirm yanlış kod: fail + güvenlik logu; durum değişmez.
 * - reset: MFA'yı düşürür + `mfa_reset` audit (fail-closed).
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
    setTotpSecret: vi.fn().mockResolvedValue(undefined),
    enableMfa: vi.fn().mockResolvedValue({
      id: "u-1",
      username: "admin",
      role: "admin",
      name: "Admin",
      mfaEnabled: true,
      createdAt: "",
      updatedAt: "",
    }),
    disableMfa: vi.fn().mockResolvedValue({
      id: "u-1",
      username: "admin",
      role: "admin",
      name: "Admin",
      mfaEnabled: false,
      createdAt: "",
      updatedAt: "",
    }),
    storeRecoveryCodes: vi.fn().mockResolvedValue(undefined),
    consumeRecoveryCode: vi.fn(),
    ...overrides,
  } as IUserRepository;
}

function mockTotp(overrides?: Partial<ITotpService>): ITotpService {
  return {
    generateSecret: vi.fn().mockReturnValue("NEWSECRET"),
    otpauthUri: vi.fn().mockReturnValue("otpauth://totp/GD-EMS:admin?secret=NEWSECRET"),
    isCodeValid: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

const logOk = vi.fn().mockResolvedValue(undefined);
const logger = { log: logOk } as never;

function mockTokens() {
  return {
    signAccess: vi.fn().mockResolvedValue("access-x"),
    signRefresh: vi.fn().mockResolvedValue("refresh-x"),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
    signMfa: vi.fn(),
    verifyMfa: vi.fn(),
  };
}

function makeCase(overrides?: {
  repo?: Partial<IUserRepository>;
  totp?: Partial<ITotpService>;
  logger?: typeof logger;
  throttle?: Partial<ITotpThrottle>;
}) {
  return new MfaEnrollUseCase(
    mockRepo(overrides?.repo),
    mockTotp(overrides?.totp),
    mockTokens() as never,
    overrides?.logger ?? logger,
    overrides?.throttle as ITotpThrottle | undefined,
  );
}

describe("MfaEnrollUseCase.enroll (T6.1)", () => {
  it("sır üretir, saklar ve otpauth URI döner", async () => {
    const setTotpSecret = vi.fn().mockResolvedValue(undefined);
    const useCase = makeCase({ repo: { setTotpSecret } });
    const result = await useCase.enroll("u-1");
    expect(result.isErr()).toBe(false);
    if (!result.isErr()) {
      expect(result.unwrap().secret).toBe("NEWSECRET");
      expect(result.unwrap().otpauthUri).toContain("otpauth://totp/");
    }
    expect(setTotpSecret).toHaveBeenCalledWith("u-1", "NEWSECRET");
  });
});

describe("MfaEnrollUseCase.confirm (T6.1)", () => {
  it("doğru kod: MFA aktifleşir, 10 kurtarma kodu döner, hash'ler saklanır", async () => {
    const enableMfa = vi.fn().mockResolvedValue({ id: "u-1", mfaEnabled: true });
    const storeRecoveryCodes = vi.fn().mockResolvedValue(undefined);
    const useCase = makeCase({
      repo: { enableMfa, storeRecoveryCodes },
    });
    const result = await useCase.confirm("u-1", "123456");
    expect(result.isErr()).toBe(false);
    if (!result.isErr()) {
      expect(result.unwrap().recoveryCodes).toHaveLength(10);
      for (const code of result.unwrap().recoveryCodes) {
        expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
      }
    }
    expect(enableMfa).toHaveBeenCalled();
    expect(storeRecoveryCodes).toHaveBeenCalledTimes(1);
    expect(result.isErr() || result.unwrap().accessToken).toBe("access-x");
    expect(result.isErr() || result.unwrap().refreshToken).toBe("refresh-x");
  });

  it("yanlış kod: fail + mfa_login_failed logu; enableMfa ÇAĞRILMAZ", async () => {
    const enableMfa = vi.fn();
    const useCase = makeCase({
      totp: { isCodeValid: vi.fn().mockReturnValue(false) },
      repo: { enableMfa },
    });
    const result = await useCase.confirm("u-1", "000000");
    expect(result.isErr()).toBe(true);
    expect(enableMfa).not.toHaveBeenCalled();
    const securityLog = logOk.mock.calls.find(
      (call) => (call[0] as { eventCode?: string }).eventCode === "mfa_login_failed",
    );
    expect(securityLog).toBeTruthy();
  });

  it("fail-closed: mfa_enrolled audit logu yazılamazsa MFA AÇILMAZ", async () => {
    const enableMfa = vi.fn();
    const failingLog = vi.fn().mockRejectedValue(new Error("sink kapali"));
    const useCase = makeCase({
      repo: { enableMfa },
      logger: { log: failingLog } as never,
    });
    const result = await useCase.confirm("u-1", "123456");
    expect(result.isErr()).toBe(true);
    expect(enableMfa).not.toHaveBeenCalled();
  });

  it("kayıt yoksa (sır yok) fail", async () => {
    const useCase = makeCase({
      repo: { totpSecretByUserId: vi.fn().mockResolvedValue(undefined) },
    });
    const result = await useCase.confirm("u-1", "123456");
    expect(result.isErr()).toBe(true);
  });

  it("T1.6: kilitli kullanıcıda kod DENENMEZ (confirm — brute-force koruması)", async () => {
    const isCodeValid = vi.fn();
    const useCase = makeCase({
      totp: { isCodeValid },
      throttle: { isLocked: vi.fn().mockResolvedValue(true) },
    });
    const result = await useCase.confirm("u-1", "123456");
    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error()).toBe("MFA dogrulamasi gecici kilitli");
    expect(isCodeValid).not.toHaveBeenCalled();
  });

  it("T1.6: yanlış kod throttle sayacını artırır", async () => {
    const recordFailure = vi.fn().mockResolvedValue(undefined);
    const useCase = makeCase({
      totp: { isCodeValid: vi.fn().mockReturnValue(false) },
      throttle: { isLocked: vi.fn().mockResolvedValue(false), recordFailure },
    });
    const result = await useCase.confirm("u-1", "000000");
    expect(result.isErr()).toBe(true);
    expect(recordFailure).toHaveBeenCalledWith("u-1");
  });
});

describe("MfaEnrollUseCase.reset (T6.1)", () => {
  it("MFA'yı düşürür + mfa_reset audit logu", async () => {
    const disableMfa = vi.fn().mockResolvedValue({ id: "u-1" });
    const useCase = makeCase({ repo: { disableMfa } });
    const result = await useCase.reset("u-1");
    expect(result.isErr()).toBe(false);
    expect(disableMfa).toHaveBeenCalledWith("u-1");
    const auditLog = logOk.mock.calls.find(
      (call) => (call[0] as { eventCode?: string }).eventCode === "mfa_reset",
    );
    expect(auditLog).toBeTruthy();
  });

  it("fail-closed: audit logu yazılamazsa reset YAPILMAZ", async () => {
    const disableMfa = vi.fn();
    const useCase = makeCase({
      repo: { disableMfa },
      logger: { log: vi.fn().mockRejectedValue(new Error("x")) } as never,
    });
    const result = await useCase.reset("u-1");
    expect(result.isErr()).toBe(true);
    expect(disableMfa).not.toHaveBeenCalled();
  });
});
