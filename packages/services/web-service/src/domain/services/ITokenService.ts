import type { User } from "@gd-monorepo/shared-types";

export interface ITokenService {
  signAccess(user: User): Promise<string>;
  signRefresh(user: User): Promise<string>;
  verifyAccess(token: string): Promise<User>;
  verifyRefresh(token: string): Promise<{ sub: string; jti: string }>;
}
