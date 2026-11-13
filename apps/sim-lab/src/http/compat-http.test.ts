// HTTP uç sözleşmesi — SPEC T-14 (R-2) kanıtı.
// AK-4.1: `/compat/*/inject` 200/400/404 ve `/compat/*/health` 503→200 davranışı.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  BUILTIN_SCENARIOS,
  FaultManager,
  Plant,
  ScenarioEngine,
  expandSite,
  normalizeSiteSpec,
} from "@gd-monorepo/simulators/physical";
import { startHttp } from "./api";

/** Repo kökü — `configs/` bulunana kadar yukarı yürünür (Stryker sandbox uyumu). */
const findRepoRoot = (start: string): string => {
  let dir = start;
  while (!existsSync(join(dir, "configs")) && dir !== dirname(dir)) dir = dirname(dir);
  return dir;
};

const repoRoot = findRepoRoot(__dirname);
const seed = process.pid % 300;
const httpPort = 45800 + seed;
const siteFile = join(repoRoot, "apps/sim-lab/sites/tek-konteyner.site.json");

const spec = normalizeSiteSpec({
  name: "compat-http",
  templatesDir: join(repoRoot, "configs"),
  network: {
    bindHost: "127.0.0.1",
    emsHost: "127.0.0.1",
    containerPortBase: 24000 + seed,
    containerPortStride: 100,
    fieldPortBase: 33000 + seed,
  },
  containers: {
    count: 1,
    bscPerContainer: 1,
    racksPerBsc: 1,
    hvacPerContainer: 0,
    hvacZoneMap: "per-bus",
    aux: {
      cb: false,
      dcMeter: false,
      dcOutput: 0,
      pm5340: false,
      imd: false,
      fss: false,
      controlPanelIo: false,
    },
  },
  pcs: { perContainer: 0 },
  mv: { stations: [] },
  sim: { http: { host: "127.0.0.1", port: httpPort } },
} as never);

const model = expandSite(spec, repoRoot);
const plant = new Plant(model);
const faults = new FaultManager(plant);
const scenarios = new ScenarioEngine(plant, faults, join(repoRoot, "apps/sim-lab/scenarios"), BUILTIN_SCENARIOS);
const base = `http://127.0.0.1:${httpPort}`;
let server: Server;

const post = (path: string, body: unknown): Promise<Response> =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  server = startHttp(plant, faults, scenarios, {
    publicDir: join(repoRoot, "apps/sim-lab/public"),
    repoRoot,
    siteFile,
  });
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await plant.stop();
});

describe("Sim-Lab HTTP uçları", () => {
  it("health: sunucular dinlemeden 503, sonra 200; /api/meta 200", async () => {
    expect((await fetch(`${base}/api/meta`)).status).toBe(200);
    expect((await fetch(`${base}/compat/c1/health`)).status).toBe(503);

    await plant.start();

    const ok = await fetch(`${base}/compat/c1/health`);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true });
  });

  it("inject: geçerli gövde 200 {applied:true}", async () => {
    const res = await post("/compat/c1/inject", { deviceId: "BSC-1", scenario: "soc:42" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ applied: true });
  });

  it("inject: bilinmeyen cihaz 404 {applied:false}, bilinmeyen senaryo 404", async () => {
    const unknownDevice = await post("/compat/c1/inject", { deviceId: "BSC-9", scenario: "fault" });
    expect(unknownDevice.status).toBe(404);
    expect(await unknownDevice.json()).toMatchObject({ applied: false });

    const unknownScenario = await post("/compat/c1/inject", { deviceId: "BSC-1", scenario: "zzz" });
    expect(unknownScenario.status).toBe(404);
    expect(await unknownScenario.json()).toMatchObject({ applied: false });
  });

  it("inject: geçersiz gövde 400", async () => {
    const res = await post("/compat/c1/inject", { scenario: "fault" });
    expect(res.status).toBe(400);
  });

  it("bilinmeyen kapsam: inject ve health 404", async () => {
    expect((await post("/compat/c9/inject", { deviceId: "BSC-1", scenario: "fault" })).status).toBe(404);
    expect((await fetch(`${base}/compat/c9/health`)).status).toBe(404);
  });
});
