/** Hata kategorisi — sınır katmanının 4xx/5xx eşlemesi ve retry kararı için. */
export type ErrorKind =
  | "validation"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "transient"
  | "fatal";

/** DomainError yapılandırması — constructor'a tek obje olarak verilir (DI kuralı 3). */
export interface DomainErrorOptions {
  kind: ErrorKind;
  retryable: boolean;
  context?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * DomainError — beklenmeyen hataların tabanı. Fırlatılır (throw); beklenen alan
 * hataları Result<T,E> ile taşınır, buraya girmez. Immutable.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly kind: ErrorKind;
  readonly retryable: boolean;
  readonly context: Record<string, unknown>;
  override readonly cause: unknown;

  constructor(code: string, message: string, options: DomainErrorOptions) {
    super(message);
    this.name = new.target.name;
    if (code.trim().length === 0) {
      throw new Error("[DomainError] code boş olamaz");
    }
    if (message.trim().length === 0) {
      throw new Error("[DomainError] message boş olamaz");
    }
    this.code = code;
    this.kind = options.kind;
    this.retryable = options.retryable;
    this.context = options.context ?? {};
    this.cause = options.cause;
  }
}

/** Alan doğrulama hatası — beklenen; 400'e eşlenir. */
export class ValidationError extends DomainError {
  constructor(code: string, message: string, options?: Pick<DomainErrorOptions, "context" | "cause">) {
    super(code, message, {
      kind: "validation",
      retryable: false,
      context: options?.context,
      cause: options?.cause,
    });
  }
}

/** Kaynak bulunamadı — beklenen; 404'e eşlenir. */
export class NotFoundError extends DomainError {
  constructor(code: string, message: string, options?: Pick<DomainErrorOptions, "context" | "cause">) {
    super(code, message, {
      kind: "not_found",
      retryable: false,
      context: options?.context,
      cause: options?.cause,
    });
  }
}

/** Kimlik doğrulama hatası — beklenen; 401'e eşlenir. */
export class UnauthorizedError extends DomainError {
  constructor(code: string, message: string, options?: Pick<DomainErrorOptions, "context" | "cause">) {
    super(code, message, {
      kind: "unauthorized",
      retryable: false,
      context: options?.context,
      cause: options?.cause,
    });
  }
}

/** Yetki hatası — beklenen; 403'e eşlenir. */
export class ForbiddenError extends DomainError {
  constructor(code: string, message: string, options?: Pick<DomainErrorOptions, "context" | "cause">) {
    super(code, message, {
      kind: "forbidden",
      retryable: false,
      context: options?.context,
      cause: options?.cause,
    });
  }
}

/** Çakışma hatası — beklenen; 409'a eşlenir. */
export class ConflictError extends DomainError {
  constructor(code: string, message: string, options?: Pick<DomainErrorOptions, "context" | "cause">) {
    super(code, message, {
      kind: "conflict",
      retryable: false,
      context: options?.context,
      cause: options?.cause,
    });
  }
}

/** Geçici altyapı hatası — sahibi (adapter) retry eder; tükenince fırlatılır. */
export class TransientError extends DomainError {
  constructor(code: string, message: string, options?: Pick<DomainErrorOptions, "context" | "cause">) {
    super(code, message, {
      kind: "transient",
      retryable: true,
      context: options?.context,
      cause: options?.cause,
    });
  }
}

/** Kalıcı altyapı hatası / fault — health düşürülür, alert kuralı tetiklenir. */
export class FatalError extends DomainError {
  constructor(code: string, message: string, options?: Pick<DomainErrorOptions, "context" | "cause">) {
    super(code, message, {
      kind: "fatal",
      retryable: false,
      context: options?.context,
      cause: options?.cause,
    });
  }
}
