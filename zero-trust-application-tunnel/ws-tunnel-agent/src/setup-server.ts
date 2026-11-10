import { Result } from "@gd-monorepo/ws-tunnel";
import { parseAgentConfig } from "./config";
import type { AgentConfig, ConfigEnv } from "./config";
import { BootstrapClaimClient } from "./claim-client";
import type { ClaimedCredential } from "./claim-client";
import { generateSecret } from "./hmac-signer";
import { renderSetupPage } from "./setup-page";

/** Setup formu — UI alan adları. */
export interface SetupForm {
  readonly hubUrl?: string;
  readonly peerId?: string;
  readonly serviceId?: string;
  readonly localTarget?: string;
  readonly authMode?: "token" | "bootstrap";
  readonly token?: string;
  readonly tlsInsecure?: boolean | string;
}

export interface SetupResult {
  readonly ok: boolean;
  readonly status: number;
  readonly errors: string[];
  readonly hubReachable?: boolean;
  readonly claimedPeerId?: string;
}

export interface SetupAgentDeps {
  readonly hostname: string;
  readonly configPath: string;
  /** Testlerde fake; üretimde global fetch. */
  readonly fetchImpl?: typeof fetch;
  /** Config'i yazan kenar fonksiyonu (üretimde `writeAgentConfigFile`). */
  readonly writeConfig: (config: AgentConfig) => void;
  /** Kaydetme başarılı olduğunda çağrılır (CLI: tunnel'ı başlatır). */
  readonly onSaved?: (config: AgentConfig) => void;
  readonly claimClient?: BootstrapClaimClient;
}

/**
 * Config yoksa VE env geçerli değilse setup UI açılmalı (sorgu — saf).
 * Config dosyası varsa ya da env tam bir config üretiyorsa setup açılmaz.
 */
export function shouldStartSetup(options: {
  configExists: boolean;
  env: ConfigEnv;
  hostname: string;
}): boolean {
  if (options.configExists) return false;
  return parseAgentConfig(options.env, { hostname: options.hostname }).isErr();
}

function formToEnv(form: SetupForm): ConfigEnv {
  return {
    HUB_URL: form.hubUrl,
    PEER_ID: form.peerId,
    SERVICE_ID: form.serviceId,
    LOCAL_TARGET: form.localTarget,
    PEER_TOKEN: form.authMode === "token" ? form.token : undefined,
    BOOTSTRAP_TOKEN: form.authMode === "bootstrap" ? form.token : undefined,
    TLS_INSECURE:
      form.tlsInsecure === true || form.tlsInsecure === "1" ? "1" : "0",
  };
}

/**
 * SetupAgent — first-boot UI'nin test/kaydet iş akışı (framework'ten bağımsız).
 *
 * Bootstrap claim **tek kullanımlıktır**: `/test`, token'ı bir kez claim edip
 * sonucu bellekte tutar; `/save` aynı token için yeniden claim ETMEZ.
 */
export class SetupAgent {
  private readonly fetchImpl: typeof fetch;
  private readonly claimClient: BootstrapClaimClient;
  private claimed?: { key: string; peerId: string; peerSecret: string };
  private saving = false;

  constructor(private readonly deps: SetupAgentDeps) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.claimClient =
      deps.claimClient ?? new BootstrapClaimClient({ fetchImpl: this.fetchImpl });
  }

  async test(form: SetupForm): Promise<SetupResult> {
    const parsed = parseAgentConfig(formToEnv(form), {
      hostname: this.deps.hostname,
    });
    if (parsed.isErr()) {
      return {
        ok: false,
        status: 400,
        errors: parsed.error().map((e) => `${e.field}: ${e.message}`),
      };
    }
    const config = parsed.unwrap();

    const hubReachable = await this.checkHub(config.hubUrl);
    if (!hubReachable) {
      return {
        ok: false,
        status: 502,
        errors: [`Hub erisilemedi: ${config.hubUrl}`],
        hubReachable: false,
      };
    }

    if (config.bootstrapToken !== undefined && config.peerSecret === undefined) {
      const claim = await this.ensureClaim(config, config.bootstrapToken);
      if (claim.isErr()) {
        return { ok: false, status: 502, errors: [claim.error()], hubReachable: true };
      }
      return {
        ok: true,
        status: 200,
        errors: [],
        hubReachable: true,
        claimedPeerId: claim.unwrap().peerId,
      };
    }

    return { ok: true, status: 200, errors: [], hubReachable: true };
  }

  async save(form: SetupForm): Promise<SetupResult> {
    if (this.saving) {
      return { ok: false, status: 409, errors: ["Kaydetme zaten suruyor"] };
    }
    const parsed = parseAgentConfig(formToEnv(form), {
      hostname: this.deps.hostname,
    });
    if (parsed.isErr()) {
      return {
        ok: false,
        status: 400,
        errors: parsed.error().map((e) => `${e.field}: ${e.message}`),
      };
    }
    this.saving = true;
    try {
      let config = parsed.unwrap();
      let errors: string[] = [];
      if (config.bootstrapToken !== undefined && config.peerSecret === undefined) {
        const claim = await this.ensureClaim(config, config.bootstrapToken);
        if (claim.isErr()) {
          errors = [claim.error()];
          return { ok: false, status: 502, errors };
        }
        // Tek kullanımlık token tüketildi: kalıcı secret yazılır, token silinir.
        config = {
          ...config,
          peerSecret: claim.unwrap().peerSecret,
          bootstrapToken: undefined,
        };
      }
      const withSecret: AgentConfig = {
        ...config,
        hubSecret: config.hubSecret ?? generateSecret(),
      };
      this.deps.writeConfig(withSecret);
      this.deps.onSaved?.(withSecret);
      return { ok: true, status: 200, errors: [] };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        errors: [`Config yazilamadi: ${(error as Error).message}`],
      };
    } finally {
      this.saving = false;
    }
  }

  private async checkHub(hubUrl: string): Promise<boolean> {
    try {
      const response = await this.fetchImpl(`${hubUrl.replace(/\/+$/, "")}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async ensureClaim(
    config: AgentConfig,
    bootstrapToken: string,
  ): Promise<Result<ClaimedCredential, string>> {
    const key = `${config.hubUrl}|${config.peerId}|${bootstrapToken}`;
    if (this.claimed?.key === key) {
      return Result.ok({
        peerId: this.claimed.peerId,
        peerSecret: this.claimed.peerSecret,
      });
    }
    const result = await this.claimClient.claim(
      config.hubUrl,
      config.peerId,
      bootstrapToken,
    );
    if (result.isOk()) {
      this.claimed = { key, ...result.unwrap() };
    }
    return result;
  }
}

/** Setup HTTP sunucusu (first-boot UI) — Bun.serve kenar katmanı. */
export function startSetupServer(options: {
  port: number;
  agent: SetupAgent;
}): { stop(): void } {
  const server = Bun.serve({
    port: options.port,
    hostname: "0.0.0.0",
    async fetch(request) {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/") {
        return new Response(renderSetupPage(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      if (
        request.method === "POST" &&
        (url.pathname === "/test" || url.pathname === "/save")
      ) {
        const form = (await request.json().catch(() => ({}))) as SetupForm;
        const result =
          url.pathname === "/test"
            ? await options.agent.test(form)
            : await options.agent.save(form);
        return Response.json(result, { status: result.status });
      }
      return new Response("not found", { status: 404 });
    },
  });
  return { stop: () => server.stop(true) };
}
