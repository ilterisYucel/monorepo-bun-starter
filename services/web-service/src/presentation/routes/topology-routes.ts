import { readFileSync, existsSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import type { FieldTopology } from "@gd-monorepo/shared-types";

/**
 * Saha topolojisi ucu (EMS domain) — `GET /api/fields/:fieldId/topology`.
 *
 * İstasyon/fider/ünite mantıksal modeli ve konteyner→istasyon eşlemesi burada
 * yaşar (hub'a domain sızmaz). Kaynak: `FIELD_TOPOLOGY_PATH` JSON dosyası;
 * tanımsız/eksikse 404 (frontend statik fallback'e düşer).
 */
export interface TopologyRouteDeps {
  /** Topoloji JSON yolu — verilmezse `FIELD_TOPOLOGY_PATH` env'i. */
  path?: string | undefined;
}

export function readFieldTopology(path: string | undefined): FieldTopology | undefined {
  const resolved = path ?? process.env.FIELD_TOPOLOGY_PATH;
  if (resolved === undefined || resolved.length === 0 || !existsSync(resolved)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(resolved, "utf-8")) as FieldTopology;
    return Array.isArray(parsed.stations) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function topologyRoutes(
  fastify: FastifyInstance,
  deps: TopologyRouteDeps = {},
): Promise<void> {
  fastify.get("/:fieldId/topology", async (request, reply) => {
    const user = (request as unknown as { user?: { role?: string } }).user;
    if (user === undefined) return reply.status(401).send({ error: "Yetkilendirme gerekli" });
    const topology = readFieldTopology(deps.path);
    if (topology === undefined) return reply.status(404).send({ error: "Topoloji tanimli degil" });
    return reply.send(topology);
  });
}
