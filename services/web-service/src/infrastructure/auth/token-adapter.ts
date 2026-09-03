import { SignJWT, jwtVerify } from "jose";
import type { AuthConfig } from "../../config/default";
import type { User } from "@gd-monorepo/shared-types";
import type { ITokenService } from "../../domain/services/ITokenService";

interface AccessPayload {
  sub: string;
  username: string;
  role: User["role"];
  name: string;
  type: "access";
  fieldIds?: string[];
  mustChangePassword?: boolean;
  mfaEnabled?: boolean;
}

interface RefreshPayload {
  sub: string;
  type: "refresh";
  jti: string;
}

interface MfaPayload {
  sub: string;
  type: "mfa";
}

export class TokenAdapter implements ITokenService {
  private readonly secret: Uint8Array;

  constructor(private readonly config: AuthConfig) {
    this.secret = new TextEncoder().encode(config.jwtSecret);
  }

  async signAccess(user: User): Promise<string> {
    return new SignJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      type: "access" as const,
      fieldIds: user.fieldIds ?? [],
      mustChangePassword: user.mustChangePassword ?? false,
      // Faz 6 T6.1: rbac enforcement'ı bu claim'i okur.
      mfaEnabled: user.mfaEnabled ?? false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(
        Math.floor(Date.now() / 1000) + this.config.accessTokenExpirySeconds,
      )
      .sign(this.secret);
  }

  async signRefresh(user: User): Promise<string> {
    return new SignJWT({
      sub: user.id,
      type: "refresh" as const,
      jti: crypto.randomUUID(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(
        Math.floor(Date.now() / 1000) + this.config.refreshTokenExpirySeconds,
      )
      .sign(this.secret);
  }

  async verifyAccess(token: string): Promise<User> {
    // 2026-08-30 (T1.2): algorithms pinlenir — jose aksi halde token'ın kendi
    // alg header'ını kullanır (HS512/HS384 aynı secret ile doğrulanabilirdi).
    const { payload } = await jwtVerify<AccessPayload>(token, this.secret, {
      algorithms: ["HS256"],
    });
    if (payload.type !== "access") throw new Error("Gecersiz token turu");
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      name: payload.name,
      fieldIds: payload.fieldIds ?? [],
      mustChangePassword: payload.mustChangePassword ?? false,
      mfaEnabled: payload.mfaEnabled ?? false,
      createdAt: "",
      updatedAt: "",
    };
  }

  async verifyRefresh(token: string): Promise<{ sub: string; jti: string }> {
    const { payload } = await jwtVerify<RefreshPayload>(token, this.secret, {
      algorithms: ["HS256"],
    });
    if (payload.type !== "refresh") throw new Error("Gecersiz token turu");
    return { sub: payload.sub, jti: payload.jti };
  }

  async signMfa(userId: string): Promise<string> {
    return new SignJWT({
      sub: userId,
      type: "mfa" as const,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(
        Math.floor(Date.now() / 1000) + this.config.mfaTokenExpirySeconds,
      )
      .sign(this.secret);
  }

  async verifyMfa(token: string): Promise<{ sub: string }> {
    const { payload } = await jwtVerify<MfaPayload>(token, this.secret, {
      algorithms: ["HS256"],
    });
    if (payload.type !== "mfa") throw new Error("Gecersiz token turu");
    return { sub: payload.sub };
  }
}
