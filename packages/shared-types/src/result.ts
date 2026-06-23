export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly error?: string,
    public readonly value?: T,
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result<T>(true, undefined, value);
  }

  static fail<T>(error: string): Result<T> {
    return new Result<T>(false, error);
  }

  get isFailure(): boolean {
    return !this.isSuccess;
  }
}
