import type { IConsumerCredentials } from "../domain/ports/consumer-credentials";

/** AuthenticateConsumerToken — consumer kimliği (peer token'ından ayrı). */
export class AuthenticateConsumerToken {
  constructor(private readonly credentials: IConsumerCredentials) {}

  execute(token: string): boolean {
    return this.credentials.verify(token);
  }
}
