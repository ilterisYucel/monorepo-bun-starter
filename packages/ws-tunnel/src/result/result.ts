/**
 * Result<T,E> — beklenen hataların exception'sız taşınması.
 *
 * Paket bağımsızdır (monorepo'ya import YOK). API, tüketicilerin alıştığı
 * `Result` sözleşmesiyle birebirdir: `ok/err/okVoid`, `isOk/isErr`,
 * `unwrap/error/unwrapOr`, `map/andThen/match`.
 */

const VOID_SENTINEL = Symbol("result-void");

export class Result<T, E> {
  private constructor(
    private readonly okValue: T | undefined,
    private readonly errValue: E | undefined,
  ) {
    if (okValue === undefined && errValue === undefined) {
      throw new Error("[Result] ok ve err değeri aynı anda boş olamaz");
    }
    if (okValue !== undefined && errValue !== undefined) {
      throw new Error("[Result] ok ve err değeri aynı anda dolu olamaz");
    }
    if (okValue === null || errValue === null) {
      throw new Error("[Result] null değer kabul edilmez");
    }
  }

  static ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>(value, undefined);
  }

  static err<T = never, E = never>(error: E): Result<T, E> {
    return new Result<T, E>(undefined, error);
  }

  static okVoid<T = void, E = never>(): Result<T, E> {
    return new Result<T, E>(VOID_SENTINEL as unknown as T, undefined);
  }

  isOk(): boolean {
    return this.errValue === undefined;
  }

  isErr(): boolean {
    return this.okValue === undefined;
  }

  unwrap(): T {
    if (this.errValue !== undefined) {
      throw new Error("[Result] hata sonucu üzerinde unwrap çağrıldı");
    }
    return this.okValue as T;
  }

  error(): E {
    if (this.okValue !== undefined) {
      throw new Error("[Result] başarı sonucu üzerinde error çağrıldı");
    }
    return this.errValue as E;
  }

  unwrapOr(fallback: T): T {
    return this.errValue === undefined ? (this.okValue as T) : fallback;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.errValue !== undefined) {
      return new Result<U, E>(undefined, this.errValue);
    }
    return new Result<U, E>(fn(this.okValue as T), undefined);
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.errValue !== undefined) {
      return new Result<U, E>(undefined, this.errValue);
    }
    return fn(this.okValue as T);
  }

  match<U>(onOk: (value: T) => U, onErr: (error: E) => U): U {
    if (this.errValue !== undefined) {
      return onErr(this.errValue);
    }
    return onOk(this.okValue as T);
  }
}
