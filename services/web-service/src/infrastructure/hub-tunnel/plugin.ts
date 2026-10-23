import type { FastifyPluginAsync, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import type { IHubTunnelPort } from "../../domain/ports/hub-tunnel";
import { HubConsumerClient } from "./hub-consumer-client";

/** Plugin seçenekleri — app-agnostik, iki alan (K14/K15). */
export interface HubTunnelPluginOptions extends FastifyPluginOptions {
  baseUrl: string;
  token: string;
  /** Test enjeksiyonu. */
  fetchImpl?: typeof fetch;
}

declare module "fastify" {
  interface FastifyInstance {
    /** Hub tünel erişim portu — `hubTunnelPlugin` takılıysa mevcuttur. */
    hubTunnel: IHubTunnelPort;
  }
}

/**
 * hubTunnelPlugin — hub tünel istemcisinin Fastify ambalajı (K15).
 *
 * Yalnız `{ baseUrl, token }` ile takılır; `fastify.hubTunnel` decorator'ı
 * `IHubTunnelPort`'u sunar. İş mantığı içermez.
 */
export const hubTunnelPlugin: FastifyPluginAsync<HubTunnelPluginOptions> = fp(
  async (fastify, options) => {
    const client = new HubConsumerClient({
      baseUrl: options.baseUrl,
      token: options.token,
      ...(options.fetchImpl !== undefined
        ? { fetchImpl: options.fetchImpl }
        : {}),
    });
    fastify.decorate("hubTunnel", client);
  },
  { name: "hub-tunnel" },
);
