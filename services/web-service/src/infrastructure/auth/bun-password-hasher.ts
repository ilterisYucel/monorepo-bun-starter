import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";

export class BunPasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
