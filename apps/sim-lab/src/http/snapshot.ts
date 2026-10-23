// Arayüz durum özetleri.
//  • siteSnapshot — tüm saha, kompakt (SSE ile 1 Hz; 9 konteyner / 226 sunucuda ~40 KB)
//  • deviceDetail  — tek cihazın model ayrıntısı (cihaz penceresi açıkken istenir)

import {
  ACK_NAME,
  CMD_NAME,
  FAULT_BITS,
  OP_NAME,
  RACK_ENERGY_KWH,
  STATE_NAME,
  type FaultManager,
  type Plant,
  type ScenarioEngine,
  type StringLink,
} from "@gd-monorepo/simulators/physical";

const r1 = (v: number): number => Math.round(v * 10) / 10;
const r2 = (v: number): number => Math.round(v * 100) / 100;
const r3 = (v: number): number => Math.round(v * 1000) / 1000;

const bits = (words: number[]): string[] =>
  words.flatMap((w, i) => Array.from({ length: 16 }, (_, b) => ((w >> b) & 1 ? `W${i + 1}.b${b} ${FAULT_BITS[i]?.[b] ?? ""}` : "")).filter(Boolean));

function stringSummary(p: Plant, s: StringLink) {
  const b = s.bsc;
  const pcs = s.pcs;
  const ib = b.infoBits();
  const cb = p.legacySim<{ readDiscreteInput(a: number): boolean }>(s.cbKey);
  let tMax = -99;
  for (const r of b.racks) tMax = Math.max(tMax, r.stats().tMax);
  return {
    key: s.key,
    cb: s.cbKey ? { key: s.cbKey, closed: cb ? cb.readDiscreteInput(0) : true } : null,
    bsc: {
      state: b.state,
      ack: b.ack,
      online: b.online.length,
      racks: b.racks.length,
      soc: r2(b.soc()),
      dcV: r1(b.online.length ? b.busVoltage : b.anticipatedVoltage()),
      current: r1(b.sectionCurrent),
      chg: r1(b.limits.chargeKw),
      dis: r1(b.limits.dischargeKw),
      info: ib,
      tMax: r1(tMax),
      diag: b.diag.active().length + b.racks.reduce((n, r) => n + r.diag.active().length, 0),
      hbAgo: b.hbEverWritten ? r1((Date.now() - b.lastHbChangeWall) / 1000) : null,
    },
    pcs: pcs
      ? {
          key: s.pcsKey,
          op: pcs.opStatus,
          phase: pcs.phase,
          p: r1(pcs.pAc),
          q: r1(pcs.qAc),
          sp: pcs.setpoint(),
          fault: pcs.faultActive(),
          alarm: pcs.alarmActive(),
          igbt: r1(Math.max(...pcs.igbt)),
          derated: pcs.derated,
          grid: pcs.grid.present,
          bmsOk: pcs.bmsLinkOk(),
          src: pcs.settings.get(0x0e00) ?? 0,
        }
      : null,
    link: s.link ? { link: s.link.stats.link, broken: s.link.broken } : null,
    feeder: s.feeder ?? null,
  };
}

export function siteSnapshot(p: Plant, fm: FaultManager, se: ScenarioEngine): unknown {
  const spec = p.spec;
  const containers = Array.from({ length: spec.containers.count }, (_, i) => {
    const c = i + 1;
    const pre = `C${c}.`;
    const imd = p.legacySim<{ state?: { alarm: boolean } }>(`${pre}IMD-1`) as unknown as { state?: { alarm: boolean } } | undefined;
    const cpio = p.legacySim<{ state?: Record<string, boolean> }>(`${pre}CONTROL-PANEL-IO-1`) as unknown as { state?: Record<string, boolean> } | undefined;
    return {
      c,
      strings: p.strings.filter((s) => s.container === c).map((s) => stringSummary(p, s)),
      hvacs: [...p.hvacs.entries()]
        .filter(([k]) => k.startsWith(pre))
        .map(([k, h]) => ({ key: k, status: h.status, on: h.remoteOn, comp: h.compressor, zoneT: r1(p.zones.get(k)?.airT ?? 0), alarm: [...h.alarms.values()].some(Boolean) })),
      imdAlarm: imd?.state?.alarm ?? false,
      doors: cpio?.state ? { battery: !!cpio.state["batteryDoorOpen"], panel: !!cpio.state["panelDoorOpen"] } : null,
    };
  });
  const mv = spec.mv.stations.map((st) => {
    const sim = p.legacySim<{ cellPosition(h: string): boolean; earthClosed(h: string): boolean }>(st.id);
    const cells = ["H01", "H02", "H04", "H05"].map((h) => ({ id: h, closed: (() => { try { return sim?.cellPosition(h) ?? true; } catch { return true; } })() }));
    return { id: st.id, name: st.name ?? st.id, incomer: st.incomer, feeders: st.feeders, cells };
  });
  let emsClients = 0, emsDevices = 0, reqs = 0;
  const devices = [...p.devices.values()].map((d) => {
    const s = d.server.stats;
    const nc = s.clients.length;
    if (nc > 0) {
      emsClients += nc;
      emsDevices++;
    }
    reqs += s.requests;
    return [d.key, s.listening ? 1 : 0, nc, s.lastRequestAt ? r1((Date.now() - s.lastRequestAt) / 1000) : -1, d.server.fault.mode === "online" ? "" : d.server.fault.mode, d.overlay.size(), s.errors] as const;
  });
  const run = se.run;
  const t = p.totals();
  return {
    t: Date.now(),
    simT: Math.round(p.simT),
    tod: r2(p.tod()),
    day: p.day(),
    speed: p.speed,
    paused: p.paused,
    loopMs: r1(p.loopMs),
    profile: p.realism.profile,
    realism: p.realism,
    assist: p.assist,
    outdoorC: r1(p.outdoorC()),
    weather: { ...p.weather.cfg, offsetC: p.weather.offsetC },
    grid: { v: r1(p.grid.vLL), hz: r2(p.grid.hz), override: p.grid.override },
    totals: { p: r1(t.pcsKw), q: r1(t.pcsKvar), soc: r2(t.socAvg), onlineRacks: t.onlineRacks, racks: t.racks, energyKwh: Math.round(t.energyKwh), capacityKwh: Math.round(t.capacityKwh) },
    containers,
    mv,
    /** [key, listening, clients, lastReqAgo, commFault, overrides, errors] */
    devices,
    ems: { clients: emsClients, devices: emsDevices, requests: reqs },
    faults: fm.active,
    overrides: [...p.devices.values()].flatMap((d) => d.overlay.list().map((o) => ({ key: d.key, ...o }))).slice(0, 400),
    series: p.series.status(),
    scenario: run
      ? {
          id: run.scenario.id,
          name: run.scenario.name,
          elapsed: Math.round(p.simT - run.startedSimT),
          total: run.scenario.steps.length ? Math.max(...run.scenario.steps.map((s) => s.at + (s.do === "expect" ? (s.within ?? 600) : 0))) : 0,
          next: run.next,
          steps: run.scenario.steps.length,
          done: run.done,
          expects: run.expects.map(({ label, status, at, detail }) => ({ label, status, at, detail })),
        }
      : null,
    scenarioHistory: se.history.slice(0, 10),
    compatCount: p.events.compat.size,
    uptime: Math.round((Date.now() - p.startedAt) / 1000),
  };
}

/** Cihaz penceresi "Model" sekmesi. */
export function deviceDetail(p: Plant, key: string): unknown {
  const d = p.device(key);
  const s = d.server.stats;
  const base = {
    key: d.key,
    deviceId: d.deviceId,
    name: d.name,
    type: d.type,
    kind: d.kind,
    container: d.container ?? null,
    port: s.port,
    comm: { listening: s.listening, bindError: s.bindError ?? null, clients: s.clients.length, clientList: s.clients, requests: s.requests, reads: s.reads, writes: s.writes, errors: s.errors, lastRequestAgo: s.lastRequestAt ? r1((Date.now() - s.lastRequestAt) / 1000) : null, lastWriteAgo: s.lastWriteAt ? r1((Date.now() - s.lastWriteAt) / 1000) : null, fault: d.server.fault },
    overrides: d.overlay.list(),
    faults: [] as unknown[],
  };
  const bsc = p.bscs.get(key);
  if (bsc) {
    const L = bsc.limits;
    return {
      ...base,
      bsc: {
        state: bsc.state,
        stateName: STATE_NAME[bsc.state],
        ack: bsc.ack,
        ackName: ACK_NAME[bsc.ack] ?? String(bsc.ack),
        lastAccepted: CMD_NAME[bsc.lastAccepted] ?? String(bsc.lastAccepted),
        soc: r2(bsc.soc()),
        soh: r2(bsc.soh()),
        dcV: r1(bsc.online.length ? bsc.busVoltage : bsc.anticipatedVoltage()),
        current: r1(bsc.sectionCurrent),
        powerKw: r1((bsc.sectionCurrent * bsc.busVoltage) / 1000),
        energyKwh: r1(bsc.racks.reduce((x, r) => x + r.energyKwh(), 0)),
        capacityKwh: r1(bsc.racks.length * RACK_ENERGY_KWH),
        limits: { chg: r1(L.chargeKw), dis: r1(L.dischargeKw), spc: L.spc, vpc: L.vpc, preVpc: L.preVpc, tpc: L.tpc },
        info: bsc.infoBits(),
        hb: bsc.heartbeat(),
        ctrlHb: bsc.lastHbValue,
        hbAgo: bsc.hbEverWritten ? r1((Date.now() - bsc.lastHbChangeWall) / 1000) : null,
        frozen: bsc.frozen,
        diag: bsc.diag.active().map((x) => ({ code: x.code, name: x.name, level: x.level })),
        racks: bsc.racks.map((r) => {
          const st = r.stats();
          const l = r.limits();
          return {
            id: r.id,
            state: r.state,
            online: r.online,
            closing: r.closing,
            rbmsUp: r.rbmsUp,
            disabled: r.disabled,
            soc: r2(r.reportedSoc()),
            soh: r2(r.soh),
            v: r1(r.cellSum()),
            i: r1(r.current),
            vMax: r3(st.vMax),
            vMin: r3(st.vMin),
            dV: Math.round((st.vMax - st.vMin) * 1000),
            tMax: r1(st.tMax),
            tMin: r1(st.tMin),
            airT: r1(r.airT),
            balancing: r.balancingActive,
            limChg: r1(l.chargeKw),
            limDis: r1(l.dischargeKw),
            diag: r.diag.active().map((x) => ({ code: x.code, level: x.level })),
            inj: Object.entries(r.inj).filter(([, v]) => v !== false && v !== null && v !== 0).map(([k]) => k),
            packT: Array.from(r.packT, (x) => r1(x)),
          };
        }),
      },
    };
  }
  const pcs = p.pcss.get(key) ?? (key.endsWith("-BMS") ? p.pcss.get(key.slice(0, -4)) : undefined);
  if (pcs) {
    return {
      ...base,
      pcs: {
        phase: pcs.phase,
        op: pcs.opStatus,
        opName: OP_NAME[pcs.opStatus],
        p: r1(pcs.pAc),
        q: r1(pcs.qAc),
        pDc: r1(pcs.pDc),
        dcV: r1(pcs.dcVoltage),
        dcI: r1(pcs.dcCurrent),
        setpoint: pcs.setpoint(),
        cmdSource: pcs.settings.get(0x0e00) ?? 0,
        rate: pcs.settings.get(0x0e1e) ?? 0,
        maxKw: r1(pcs.maxActiveKw()),
        allowChg: r1(pcs.allowableChargeKw()),
        allowDis: r1(pcs.allowableDischargeKw()),
        derate: r2(pcs.deratingFactor()),
        derated: pcs.derated,
        igbt: pcs.igbt.map(r1),
        reactor: pcs.reactor.map(r1),
        cavity: r1(pcs.cavity),
        ambient: r1(pcs.ambientC),
        insulation: Math.round(pcs.insulationKohm),
        breakers: { ac: pcs.acBreakerClosed, dc: pcs.dcBreakerClosed, acPre: pcs.acPrecharge, dcPre: pcs.dcPrecharge },
        estop: pcs.estop,
        door: pcs.doorOpen,
        grid: { present: pcs.grid.present, v: r1(pcs.grid.vLL), hz: r2(pcs.grid.hz) },
        faults: bits(pcs.faults),
        alarms: bits(pcs.alarms),
        bms: { linkOk: pcs.bmsLinkOk(), ago: pcs.bmsLastWriteWall ? r1((Date.now() - pcs.bmsLastWriteWall) / 1000) : null, raw: [...pcs.bms] },
        energy: { accChg: Math.round(pcs.accChargeKwh), accDis: Math.round(pcs.accDischargeKwh), dayChg: r1(pcs.dailyChargeKwh), dayDis: r1(pcs.dailyDischargeKwh) },
        emsAgo: r1((Date.now() - pcs.emsLastRequestWall) / 1000),
        emsTimeoutS: pcs.emsTimeoutS,
        bmsTimeoutS: pcs.bmsTimeoutS,
      },
    };
  }
  const h = p.hvacs.get(key);
  if (h) {
    const st = h.serverTemps();
    return {
      ...base,
      hvac: {
        status: h.status,
        on: h.remoteOn,
        comp: h.compressor,
        heater: h.heater,
        indoor: h.indoorFan,
        outdoor: h.outdoorFan,
        returnT: r1(h.returnT),
        supplyT: r1(h.supplyT),
        cond: r1(h.condT),
        evap: r1(h.evapT),
        coolSet: h.coolSet(),
        heatSet: h.heatSet(),
        mode: h.hold.get(0x09),
        server: { max: st.valid ? st.max : null, min: st.valid ? st.min : null, fresh: st.fresh },
        alarms: [...h.alarms.entries()].filter(([, v]) => v).map(([a]) => `0x${a.toString(16)}`),
        powerW: Math.round(h.powerW),
        coolW: Math.round(-Math.min(0, h.heatToZone)),
        zoneT: r1(p.zones.get(key)?.airT ?? 0),
        racks: (p.zoneRacks.get(key) ?? []).map((x) => `${x.bsc}/R${x.rack}`),
        inj: Object.entries(h.inj).filter(([, v]) => v !== false && v !== null && v !== 0).map(([k]) => k),
      },
    };
  }
  const link = [...p.links.values()].find((l) => l.id === key);
  if (link) return { ...base, link: { ...link.stats, broken: link.broken, block: [...link.last] } };
  return base;
}
