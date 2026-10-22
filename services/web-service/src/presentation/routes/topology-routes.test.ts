import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFieldTopology, topologyRoutes } from "./topology-routes";

/**
 * Saha topolojisi ucu (EMS domain) — `GET /api/fields/:fieldId/topology`.
 * İstasyon/fider/ünite modeli ve konteyner→istasyon eşlemesi burada yaşar;
 * dosya yoksa 404 (frontend statik fallback).
 */

const TOPOLOGY = {
  stations: [
    {
      key: "bess1",
      name: "BESS MV STATION #1",
      feeders: { A: { cell: "H04", units: [1, 2, 3, 4, 5] }, B: { cell: "H05", units: [6, 7, 8, 9] } },
      units: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      containers: ["container-1"],
      pcs: ["PCS-1", "PCS-2"],
      mvDeviceId: "DEMO-MV-1",
    },
  ],
};

function topologyFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "topology-"));
  const path = join(dir, "topology.json");
  writeFileSync(path, JSON.stringify(TOPOLOGY));
  return path;
}

async function buildApp(path: string | undefined, withUser = true) {
  const app = Fastify();
  app.addHook("onRequest", (request, _reply, done) => {
    if (withUser) (request as unknown as { user: { role: string } }).user = { role: "admin" };
    done();
  });
  await app.register(
    async (fastify) => {
      await topologyRoutes(fastify, { path });
    },
    { prefix: "/api/fields" },
  );
  return app;
}

describe("topology-routes", () => {
  it("AK: topoloji dosyası varsa istasyon modelini döner", async () => {
    const app = await buildApp(topologyFile());
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/topology" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as typeof TOPOLOGY;
    expect(body.stations).toHaveLength(1);
    expect(body.stations[0]!.containers).toEqual(["container-1"]);
    expect(body.stations[0]!.feeders.A.units).toEqual([1, 2, 3, 4, 5]);
  });

  it("dosya yoksa 404 (frontend statik fallback)", async () => {
    const app = await buildApp("/tmp/olmayan-topoloji.json");
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/topology" });
    expect(res.statusCode).toBe(404);
  });

  it("yetkisiz istek 401", async () => {
    const app = await buildApp(topologyFile(), false);
    const res = await app.inject({ method: "GET", url: "/api/fields/f-1/topology" });
    expect(res.statusCode).toBe(401);
  });

  it("readFieldTopology: bozuk JSON → undefined", () => {
    const dir = mkdtempSync(join(tmpdir(), "topology-bad-"));
    const path = join(dir, "topology.json");
    writeFileSync(path, "{bozuk");
    expect(readFieldTopology(path)).toBeUndefined();
  });
});
