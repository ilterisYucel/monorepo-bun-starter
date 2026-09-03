import type { User, Role } from "@gd-monorepo/shared-types";
import type { SeedUser } from "../../config/default";

export interface IUserRepository {
  initialize(seeds?: SeedUser[]): Promise<void>;

  findByUsername(username: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  usersByFieldIds(fieldIds: string[]): Promise<User[]>;
  list(): Promise<User[]>;

  create(username: string, passwordHash: string, role: Role, name: string, fieldIds?: string[]): Promise<User>;

  update(
    id: string,
    fields: {
      username?: string;
      password_hash?: string;
      role?: Role;
      name?: string;
      field_ids?: string[];
      must_change_password?: boolean;
    },
  ): Promise<User>;

  delete(id: string): Promise<void>;

  passwordHashByUsername(username: string): Promise<string | undefined>;

  storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  findByRefreshToken(token: string): Promise<User | undefined>;
  clearRefreshToken(userId: string): Promise<void>;

  // ===== Faz 6 T6.1 — MFA (TOTP) =====

  /** Kullanıcının bekleyen/kayıtlı TOTP sırrı (yoksa undefined). */
  totpSecretByUserId(userId: string): Promise<string | undefined>;

  /** Kayıt adımı: sırrı saklar (MFA henüz AKTİF değil). */
  setTotpSecret(userId: string, secret: string): Promise<void>;

  /** İlk kod doğrulanınca MFA'yı aktifleştirir. */
  enableMfa(userId: string): Promise<User>;

  /** MFA'yı düşürür (admin sıfırlaması / kayıt iptali). */
  disableMfa(userId: string): Promise<User>;

  /** Tek kullanımlık kurtarma kodu hash'lerini saklar (eski kodlar silinir). */
  storeRecoveryCodes(userId: string, codeHashes: string[]): Promise<void>;

  /**
   * Kurtarma kodunu tüketir — eşleşen kullanılmamış kod varsa true
   * (kod tek seferde yanar).
   */
  consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean>;
}
