// Sim-Lab HTTP API + SSE + arayüz (public/index.html).
//
// Okuma:   GET  /api/meta · /api/state · /api/stream (SSE) · /api/events · /api/compat
//               /api/traffic?device= · /api/device/:key · /api/device/:key/registers
//               /api/device/:key/catalog · /api/overrides · /api/series/template
// Register: POST /api/point     {selector, point, value, mode: hold|write|clear, durationS?}
//           POST /api/release   {selector, point?}
// Seri:     POST /api/series/start {name, csv | rows, timeBase, interp, loop} · POST /api/series/stop
// Arıza:    POST /api/fault {id, selector|target, params} · DELETE /api/fault/:uid · POST /api/fault-clear-all
// Senaryo:  POST /api/scenario/start|stop|save
// Sim:      POST /api/sim {speed, paused, profile, realism, assist, weather, advance, hour}
//           POST /api/autostart {powerKw, pcs?} · POST /api/export · POST /api/events-clear

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  FAULTS,
  autostart,
  exportEmsConfigs,
  normalizeRows,
  parseSeriesCsv,
  profileDefaults,
  type FaultManager,
  type Plant,
  type ProfileName,
  type Scenario,
  type ScenarioEngine,
  type SeriesMode,
  type SeriesRow,
} from "@gd-monorepo/simulators/physical";
import { deviceDetail, siteSnapshot } from "./snapshot";

export interface HttpOptions {
  publicDir: string;
  repoRoot: string;
  siteFile: string;
}

export function startHttp(p: Plant, fm: FaultManager, se: ScenarioEngine, o: HttpOptions): void {
  const clients = new Set<ServerResponse>();
  let lastEventId = 0;
  let lastTrafficSeq = 0;

  const json = (res: ServerResponse, code: number, body: unknown): void => {
    res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify(body));
  };
  const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
    new Promise((resolve) => {
      let d = "";
      req.on("data", (c) => (d += c));
      req.on("end", () => {
        try {
          resolve(d ? (JSON.parse(d) as Record<string, unknown>) : {});
        } catch {
          resolve({});
        }
      });
    });

  const meta = () => ({
    site: { name: p.spec.name, description: p.spec.description ?? "", file: o.siteFile, containers: p.spec.containers, pcs: p.spec.pcs, mv: p.spec.mv, network: p.spec.network },
    faults: FAULTS.map(({ id, group, target, label, expect, params, oneShot }) => ({ id, group, target, label, expect, params: params ?? [], oneShot: !!oneShot })),
    scenarios: se.list(),
    devices: [...p.devices.values()].map((d) => ({ key: d.key, deviceId: d.deviceId, kind: d.kind, type: d.type, name: d.name, container: d.container ?? null, port: d.server.stats.port, points: d.catalog.points.length })),
    links: [...p.links.keys()],
    profiles: { uyumlu: profileDefaults("uyumlu"), gercek: profileDefaults("gercek") },
  });

  const server = createServer((req, res) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://x");
    const path = url.pathname;
    try {
      if (req.method === "GET" && (path === "/" || path === "/index.html")) {
        const f = join(o.publicDir, "index.html");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        res.end(existsSync(f) ? readFileSync(f) : "index.html yok");
        return;
      }
      if (req.method === "GET") {
        if (path === "/api/meta") return json(res, 200, meta());
        if (path === "/api/state") return json(res, 200, siteSnapshot(p, fm, se));
        if (path === "/api/events") return json(res, 200, p.events.since(Number(url.searchParams.get("since") ?? 0), 1000));
        if (path === "/api/compat") return json(res, 200, [...p.events.compat.values()]);
        if (path === "/api/overrides") return json(res, 200, [...p.devices.values()].flatMap((d) => d.overlay.list().map((x) => ({ key: d.key, ...x }))));
        if (path === "/api/traffic") {
          const dev = url.searchParams.get("device");
          return json(res, 200, p.traffic.filter((t) => !dev || t.device === dev).slice(-500));
        }
        const m = /^\/api\/device\/([^/]+)(\/registers|\/catalog)?$/.exec(path);
        if (m) {
          const key = decodeURIComponent(m[1]!);
          if (m[2] === "/registers") return json(res, 200, { key, rows: await p.readAll(key) });
          if (m[2] === "/catalog") return json(res, 200, p.device(key).catalog.points);
          return json(res, 200, deviceDetail(p, key));
        }
        if (path === "/api/select") return json(res, 200, p.select(url.searchParams.get("q") ?? ""));
        if (path === "/api/series/template") {
          const sel = url.searchParams.get("selector") ?? "C1.HVAC-1";
          const pt = url.searchParams.get("point") ?? "Current Temp";
          const csv = ["t,target,register,value,mode", `0,${sel},${pt},25,hold`, `60,${sel},${pt},32,hold`, `120,${sel},${pt},38,hold`, `180,${sel},${pt},,clear`].join("\n");
          res.writeHead(200, { "content-type": "text/csv; charset=utf-8" });
          res.end(csv);
          return;
        }
        if (path === "/api/stream") {
          res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
          res.write("retry: 2000\n\n");
          clients.add(res);
          req.on("close", () => clients.delete(res));
          res.write(`event: events\ndata: ${JSON.stringify(p.events.recent(400))}\n\n`);
          res.write(`event: state\ndata: ${JSON.stringify(siteSnapshot(p, fm, se))}\n\n`);
          return;
        }
        return json(res, 404, { error: "yok" });
      }

      const body = await readBody(req);
      if (path === "/api/point" && req.method === "POST") {
        const sel = String(body.selector ?? body.key ?? "");
        const value = body.value === null || body.value === undefined || body.value === "" ? null : Number(body.value);
        const mode = String(body.mode ?? "hold") as SeriesMode;
        const dur = body.durationS === undefined || body.durationS === "" ? undefined : Number(body.durationS);
        return json(res, 200, await p.applyBulk(sel, String(body.point ?? ""), value, mode, "arayüz", dur));
      }
      if (path === "/api/release" && req.method === "POST") {
        return json(res, 200, await p.applyBulk(String(body.selector ?? "all"), String(body.point ?? "*"), null, "clear", "arayüz"));
      }
      if (path === "/api/series/start") {
        let rows: SeriesRow[];
        if (typeof body.csv === "string") rows = parseSeriesCsv(body.csv);
        else rows = normalizeRows((body.rows as SeriesRow[]) ?? []);
        p.series.start(
          {
            id: `s${Date.now()}`,
            name: String(body.name ?? "seri"),
            timeBase: body.timeBase === "wall" ? "wall" : "sim",
            interp: body.interp === "linear" ? "linear" : "step",
            loop: body.loop === true,
            rows,
          },
          p.simT,
        );
        return json(res, 200, { ok: true, rows: rows.length, duration: rows.length ? rows[rows.length - 1]!.t : 0 });
      }
      if (path === "/api/series/parse") {
        const rows = parseSeriesCsv(String(body.csv ?? ""));
        const targets = [...new Set(rows.map((r) => r.target))].map((t) => ({ selector: t, devices: p.select(t) }));
        return json(res, 200, { rows: rows.length, duration: rows.length ? rows[rows.length - 1]!.t : 0, targets, preview: rows.slice(0, 50) });
      }
      if (path === "/api/series/stop") {
        p.series.stop();
        return json(res, 200, { ok: true });
      }
      if (path === "/api/fault" && req.method === "POST") {
        const sel = String(body.selector ?? body.target ?? "SITE");
        return json(res, 200, fm.injectMany(String(body.id), sel, (body.params as Record<string, unknown>) ?? {}));
      }
      if (path.startsWith("/api/fault/") && req.method === "DELETE") {
        fm.clear(Number(path.split("/").pop()));
        return json(res, 200, { ok: true });
      }
      if (path === "/api/fault-clear-all") {
        fm.clearAll();
        return json(res, 200, { ok: true });
      }
      if (path === "/api/scenario/start") {
        se.start(String(body.id));
        return json(res, 200, { ok: true });
      }
      if (path === "/api/scenario/stop") {
        se.stop();
        return json(res, 200, { ok: true });
      }
      if (path === "/api/scenario/save") {
        se.save(body.scenario as Scenario);
        return json(res, 200, { ok: true });
      }
      if (path === "/api/sim") {
        if (typeof body.speed === "number") p.speed = Math.max(0.1, Math.min(600, body.speed));
        if (typeof body.paused === "boolean") p.paused = body.paused;
        if (typeof body.profile === "string") p.setProfile(body.profile as ProfileName);
        if (body.realism && typeof body.realism === "object") p.setRealism(body.realism as never);
        if (body.assist && typeof body.assist === "object") Object.assign(p.assist, body.assist);
        if (body.weather && typeof body.weather === "object") Object.assign(p.weather.cfg, body.weather);
        if (typeof body.advance === "number") p.advance(Math.min(86400, body.advance));
        if (typeof body.hour === "number") p.simT = Math.floor(p.simT / 86400) * 86400 + body.hour * 3600;
        return json(res, 200, { ok: true });
      }
      if (path === "/api/comm" && req.method === "POST") {
        const keys = p.select(String(body.selector ?? ""));
        for (const k of keys) p.device(k).server.setFault({ mode: (body.mode as never) ?? "online", ...(body.delayMs ? { delayMs: Number(body.delayMs) } : {}) });
        return json(res, 200, { ok: true, devices: keys.length });
      }
      if (path === "/api/autostart") {
        autostart(p, Number(body.powerKw ?? 0), Array.isArray(body.pcs) ? (body.pcs as string[]) : undefined);
        return json(res, 200, { ok: true });
      }
      if (path === "/api/export") {
        const r = exportEmsConfigs(p.model, o.repoRoot, typeof body.outDir === "string" && body.outDir ? body.outDir : undefined);
        p.events.push("info", "EXPORT", `${r.files.length} dosya → ${r.outDir}`);
        return json(res, 200, r);
      }
      if (path === "/api/events-clear") {
        p.events.clear();
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: "yok" });
    } catch (e) {
      return json(res, 400, { error: String((e as Error).message ?? e) });
    }
  }

  // SSE yayını (1 Hz)
  setInterval(() => {
    if (clients.size === 0) {
      lastEventId = p.events.recent(1)[0]?.id ?? lastEventId;
      lastTrafficSeq = p.trafficSince(lastTrafficSeq).seq;
      return;
    }
    const st = JSON.stringify(siteSnapshot(p, fm, se));
    const evs = p.events.since(lastEventId, 300);
    if (evs.length) lastEventId = evs[evs.length - 1]!.id;
    const tr = p.trafficSince(lastTrafficSeq);
    lastTrafficSeq = tr.seq;
    const trItems = tr.items.slice(-150);
    for (const c of clients) {
      c.write(`event: state\ndata: ${st}\n\n`);
      if (evs.length) c.write(`event: events\ndata: ${JSON.stringify(evs)}\n\n`);
      if (trItems.length) c.write(`event: traffic\ndata: ${JSON.stringify(trItems)}\n\n`);
    }
  }, 1000);

  const { host, port } = p.spec.sim.http;
  server.listen(port, host, () => {
    console.log(`[sim-lab] Arayüz: http://localhost:${port}`);
  });
}
