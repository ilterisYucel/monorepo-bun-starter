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
}

interface RefreshPayload {
  sub: string;
  type: "refresh";
  jti: string;
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
    const { payload } = await jwtVerify<AccessPayload>(token, this.secret);
    if (payload.type !== "access") throw new Error("Gecersiz token turu");
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      name: payload.name,
      createdAt: "",
      updatedAt: "",
    };
  }

  async verifyRefresh(token: string): Promise<{ sub: string; jti: string }> {
    const { payload } = await jwtVerify<RefreshPayload>(token, this.secret);
    if (payload.type !== "refresh") throw new Error("Gecersiz token turu");
    return { sub: payload.sub, jti: payload.jti };
  }
}
