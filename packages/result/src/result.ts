/**
 * Result<T,E> — beklenen hataların exception'sız taşınması (Railway Oriented
 * Programming). Saf veri taşıyıcıdır: yan etki yok, mutasyon yok.
 */

/** `okVoid()` sentinel'i — değersiz başarı sonucunun iç temsili. */
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

  /** Başarı sonucu üretir (Elegant Object factory istisnası). */
  static ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>(value, undefined);
  }

  /** Hata sonucu üretir (Elegant Object factory istisnası). */
  static err<T = never, E = never>(error: E): Result<T, E> {
    return new Result<T, E>(undefined, error);
  }

  /**
   * Değersiz BAŞARILI sonuç üretir — komut tipi işlemler için (ör. logout,
   * delete). `ok(undefined)` bilinçli olarak YASAKLI olduğundan (bkz. "ok ve
   * err değeri aynı anda boş olamaz"), bu factory sentinel değerle kurulur;
   * `unwrap()` dönüş değeri yok sayılmalıdır.
   */
  static okVoid<T = void, E = never>(): Result<T, E> {
    return new Result<T, E>(VOID_SENTINEL as unknown as T, undefined);
  }

  /** Başarı durumunda mı? */
  isOk(): boolean {
    return this.errValue === undefined;
  }

  /** Hata durumunda mı? */
  isErr(): boolean {
    return this.okValue === undefined;
  }

  /** Başarı değerini döner; hata durumunda fırlatır. */
  unwrap(): T {
    if (this.errValue !== undefined) {
      throw new Error("[Result] hata sonucu üzerinde unwrap çağrıldı");
    }
    return this.okValue as T;
  }

  /** Hatayı döner; başarı durumunda fırlatır. */
  error(): E {
    if (this.okValue !== undefined) {
      throw new Error("[Result] başarı sonucu üzerinde error çağrıldı");
    }
    return this.errValue as E;
  }

  /** Değeri döner; hata durumunda fallback. */
  unwrapOr(fallback: T): T {
    return this.errValue === undefined ? (this.okValue as T) : fallback;
  }

  /** Başarı değerini dönüştürür; hatayı dokunmadan taşır. Yeni Result döner. */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.errValue !== undefined) {
      return new Result<U, E>(undefined, this.errValue);
    }
    return new Result<U, E>(fn(this.okValue as T), undefined);
  }

  /** Başarıda yeni bir Result'a zincirler; hatayı dokunmadan taşır. */
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.errValue !== undefined) {
      return new Result<U, E>(undefined, this.errValue);
    }
    return fn(this.okValue as T);
  }

  /** Her iki durumu tek çıkışa indirger. */
  match<U>(onOk: (value: T) => U, onErr: (error: E) => U): U {
    if (this.errValue !== undefined) {
      return onErr(this.errValue);
    }
    return onOk(this.okValue as T);
  }
}
