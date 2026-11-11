import type { FastifyReply, FastifyRequest } from "fastify";

/** Yanıt şekli (sabit) — tünel tipine bağımlılık yok. */
interface OfflineStatus {
  readonly connected: false;
  readonly state: "offline";
}

/**
 * GET /api/status — site "Field Bağlantısı" göstergesi.
 *
 * SPEC BOSS-FIELD-UPLINK-ARINDIRMA K4: Web-service artık hiçbir tier'da
 * tunnel connector taşımaz (konteyner kaydı agent'tadır). Bu yüzden endpoint
 * her zaman `offline` döner — UI beyaz ekranda kalmaz; gerçek bağlantı
 * durumu hub `/peers` üzerinden izlenir.
 */
export function makeStatusRoute() {
  return async function statusRoute(
    _request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const body: OfflineStatus = {
      connected: false,
      state: "offline",
    };
    return reply.send(body);
  };
}
