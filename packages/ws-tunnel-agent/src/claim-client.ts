import { Result } from "@gd-monorepo/ws-tunnel";

export interface ClaimedCredential {
  readonly peerId: string;
  readonly peerSecret: string;
}

export interface ClaimClientConfig {
  /** Testlerde enjekte edilir; üretimde global fetch. */
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

/**
 * BootstrapClaimClient — hub'ın tek kullanımlık bootstrap token'ını kalıcı
 * `peerSecret` ile takas eder (`POST /peers/bootstrap/claim`).
 *
 * Fail-closed: ağ hatası, 4xx/5xx veya peerId uyuşmazlığı `Err` döner —
 * çağıran tunnel'ı BAŞLATMAMALIDIR.
 */
export class BootstrapClaimClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(config: ClaimClientConfig = {}) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  async claim(
    hubUrl: string,
    peerId: string,
    bootstrapToken: string,
  ): Promise<Result<ClaimedCredential, string>> {
    const url = `${hubUrl.replace(/\/+$/, "")}/peers/bootstrap/claim`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ peerId, bootstrapToken }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      return Result.err(
        `Bootstrap claim basarisiz (${url}): ${(error as Error).message}`,
      );
    }
    if (!response.ok) {
      return Result.err(
        `Bootstrap claim reddedildi (HTTP ${response.status}) — token gecersiz, kullanilmis veya suresi gecmis olabilir`,
      );
    }
    const body = (await response.json().catch(() => undefined)) as
      | { peerId?: unknown; peerSecret?: unknown }
      | undefined;
    if (
      body === undefined ||
      typeof body.peerId !== "string" ||
      typeof body.peerSecret !== "string"
    ) {
      return Result.err("Bootstrap claim yaniti gecersiz (peerId/peerSecret yok)");
    }
    if (body.peerId !== peerId) {
      return Result.err(
        `Bootstrap claim peerId uyusmuyor (istenen: ${peerId}, gelen: ${body.peerId})`,
      );
    }
    return Result.ok({ peerId: body.peerId, peerSecret: body.peerSecret });
  }
}
