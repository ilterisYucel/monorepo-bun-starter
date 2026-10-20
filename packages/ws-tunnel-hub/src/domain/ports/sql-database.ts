/**
 * SqlDatabase — sqlite erişimi için minimal port (hexagonal).
 *
 * Domain/application bu portu bilmez; `SqlitePeerCredentialStore` outbound
 * adapter'ı kullanır. Runtime'e özgü implementasyonlar (`bun:sqlite`,
 * testlerde `node:sqlite`) composition root'ta enjekte edilir.
 */
export interface SqlRunResult {
  readonly changes: number;
}

export interface SqlDatabase {
  /** DDL/DML çalıştırır (parametreli). */
  run(sql: string, ...params: unknown[]): SqlRunResult;
  /** Satırları döndürür (parametreli). */
  all<T>(sql: string, ...params: unknown[]): T[];
  close(): void;
}
