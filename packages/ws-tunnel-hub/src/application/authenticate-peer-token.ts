import type { IPeerCredentialsStore } from "../domain/ports/peer-credentials-store";

/** Peer token kaynağından kimlik doğrular (saf use-case). */
export class AuthenticatePeerToken {
  constructor(private readonly store: IPeerCredentialsStore) {}

  execute(token: string): Promise<boolean> {
    return this.store.authenticate(token);
  }
}
