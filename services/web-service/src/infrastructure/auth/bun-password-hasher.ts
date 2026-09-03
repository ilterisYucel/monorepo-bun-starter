import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";

export class BunPasswordHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await Bun.password.verify(password, hash);
    } catch {
      // 2026-08-30 (T1.5): bayat/geçersiz hash formatında Bun.password.verify
      // THROW eder ("UnsupportedAlgorithm"). IPasswordHasher kontratı
      // Promise<boolean>'dir — throw login akışını 500'e düşürürdü. false
      // dönülür: kullanıcı 401 alır, olay login_failed security loguna girer.
      return false;
    }
  }
}

