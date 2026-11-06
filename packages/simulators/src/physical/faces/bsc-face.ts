// Flex BSC Modbus yüzü — Rev AF (JF1).
// Input (FC04): 30000–30169 BSC verisi, 30170 + (N−1)·STRIDE raf blokları (nameplate +0, summary +50).
// Discrete (FC02): 1..6N raf bayrakları. Holding (FC03/06/16): 40000–40200 controller verisi.
// STRIDE gerçekte 150'dir; bugünkü bsc-*.json telemetrisi 200 kullanır (uyumlu profil "auto" ile izler).

import { s32words, u32words, s16 } from "../core/util";
import type { EventLog } from "../core/events";
import type { Realism } from "../core/profile";
import { Bsc } from "../models/bsc";
import { RACK_STATE, type Rack } from "../models/battery/rack";
import { PACKS_PER_RACK } from "../models/battery/cell";
import { simpleFace } from "./face-base";
import type { DeviceFace } from "../modbus/lab-server";

export const RACK_BASE = 30170;
export const RACK_SUMMARY_OFF = 50;

export function bscFace(bsc: Bsc, realism: () => Realism, stride: () => number, events: EventLog): DeviceFace {
  const id = bsc.cfg.id;
  const word = (table: "holding" | "input", addr: number): number | undefined => {
    if (table === "holding") {
      if (addr >= 40000 && addr <= 40200) return bsc.holding.get(addr) ?? 0;
      if (addr >= 30000 && addr < 40000) {
        events.compatWarn(id, "fc3input", `EMS 3xxxx adreslerini FC03 ile okuyor (${addr})`, "Rev AF: BSC verisi yalnız FC04 ile okunur");
        if (realism().fcStrict) return undefined;
        return inputWord(addr);
      }
      return undefined;
    }
    return inputWord(addr);
  };

  const inputWord = (addr: number): number | undefined => {
    if (addr >= 30000 && addr < RACK_BASE) return bscWord(addr);
    const st = stride();
    if (addr >= RACK_BASE && addr < RACK_BASE + 80 * st) {
      const n = Math.floor((addr - RACK_BASE) / st) + 1;
      const off = (addr - RACK_BASE) % st;
      const rack = bsc.racks[n - 1];
      if (!rack) return 0;
      return rackWord(rack, off);
    }
    return undefined;
  };

  const L = () => bsc.limits;
  const on = (): Rack[] => bsc.online;

  const bscWord = (a: number): number => {
    const online = on();
    const S = <T>(f: (r: Rack) => T): T[] => online.map(f);
    switch (a) {
      case 30000: return 0x0102;
      case 30001: return 0x0011;
      case 30005: return bsc.racks.length;
      case 30030: return bsc.ack;
      case 30031: return bsc.lastAccepted;
      case 30035: return bsc.heartbeat();
      case 30036: return bsc.state;
      case 30037: {
        const ib = bsc.infoBits();
        let w = (ib.alarm ? 1 : 0) | (ib.warning ? 2 : 0) | (ib.fault ? 4 : 0) | (bsc.chargeStatusBits() << 4);
        const l = L();
        if (l.preVpc) w |= 1 << 10;
        if (l.vpc) w |= 1 << 11;
        if (l.spc) w |= 1 << 12;
        if (l.tpc) w |= 1 << 13;
        return w;
      }
      case 30038: return online.length;
      case 30043: case 30044: case 30045: case 30046: case 30047: case 30048: case 30049: case 30050:
        return bsc.diag.word(a);
      case 30055: return Math.round(bsc.soc() * 100);
      case 30056: return Math.round(bsc.soh() * 100);
      case 30057: return u32words(bsc.anticipatedVoltage() * 10000)[0];
      case 30058: return u32words(bsc.anticipatedVoltage() * 10000)[1];
      case 30059: return u32words(bsc.dcVoltage() * 10000)[0];
      case 30060: return u32words(bsc.dcVoltage() * 10000)[1];
      case 30061: return s32words(bsc.sectionCurrent * 1000)[0];
      case 30062: return s32words(bsc.sectionCurrent * 1000)[1];
      case 30063: return u32words(L().chargeKw * 1000)[0];
      case 30064: return u32words(L().chargeKw * 1000)[1];
      case 30065: return u32words(L().dischargeKw * 1000)[0];
      case 30066: return u32words(L().dischargeKw * 1000)[1];
      default: break;
    }
    if (online.length === 0) return 0;
    const ext = <K extends string>(vals: number[], ids: number[]) => {
      let mi = 0, ma = 0;
      for (let i = 1; i < vals.length; i++) { if (vals[i]! > vals[ma]!) ma = i; if (vals[i]! < vals[mi]!) mi = i; }
      const avg = vals.reduce((x, y) => x + y, 0) / vals.length;
      return { max: vals[ma]!, min: vals[mi]!, avg, maxId: ids[ma]!, minId: ids[mi]! } as { max: number; min: number; avg: number; maxId: number; minId: number } & Record<K, never>;
    };
    const ids = S((r) => r.id);
    const soc = ext(S((r) => r.reportedSoc()), ids);
    const soh = ext(S((r) => r.soh), ids);
    const vs = ext(S((r) => r.cellSum()), ids);
    const cur = ext(S((r) => r.current), ids);
    const stats = S((r) => r.stats());
    const cmax = ext(stats.map((s) => s.vMax), ids);
    const cmin = ext(stats.map((s) => s.vMin), ids);
    const cavg = stats.reduce((x, s) => x + s.vAvg, 0) / stats.length;
    const tmax = ext(stats.map((s) => s.tMax), ids);
    const tmin = ext(stats.map((s) => s.tMin), ids);
    const tavg = stats.reduce((x, s) => x + s.tAvg, 0) / stats.length;
    const rMaxV = online[ids.indexOf(cmax.maxId)]!.stats();
    const rMinV = online[ids.indexOf(cmin.minId)]!.stats();
    const rMaxT = online[ids.indexOf(tmax.maxId)]!.stats();
    const rMinT = online[ids.indexOf(tmin.minId)]!.stats();
    switch (a) {
      case 30100: return Math.round(soc.max * 100);
      case 30101: return Math.round(soc.avg * 100);
      case 30102: return Math.round(soc.min * 100);
      case 30103: return soc.maxId;
      case 30105: return soc.minId;
      case 30107: return online.filter((r) => r.calibrationReq > 0).length;
      case 30109: return Math.round(soh.max * 100);
      case 30110: return Math.round(soh.avg * 100);
      case 30111: return Math.round(soh.min * 100);
      case 30112: return soh.maxId;
      case 30114: return soh.minId;
      case 30118: return u32words(vs.max * 10000)[0];
      case 30119: return u32words(vs.max * 10000)[1];
      case 30120: return u32words(vs.avg * 10000)[0];
      case 30121: return u32words(vs.avg * 10000)[1];
      case 30122: return u32words(vs.min * 10000)[0];
      case 30123: return u32words(vs.min * 10000)[1];
      case 30124: return vs.maxId;
      case 30125: return vs.minId;
      case 30128: return s32words(cur.max * 1000)[0];
      case 30129: return s32words(cur.max * 1000)[1];
      case 30130: return s32words(cur.avg * 1000)[0];
      case 30131: return s32words(cur.avg * 1000)[1];
      case 30132: return s32words(cur.min * 1000)[0];
      case 30133: return s32words(cur.min * 1000)[1];
      case 30134: return cur.maxId;
      case 30135: return cur.minId;
      case 30138: return Math.round(cmax.max * 1000);
      case 30139: return Math.round(cavg * 1000);
      case 30140: return Math.round(cmin.min * 1000);
      case 30141: return cmax.maxId;
      case 30142: return (rMaxV.vMaxLoc >> 8) & 0xff;
      case 30143: return rMaxV.vMaxLoc & 0xff;
      case 30144: return cmin.minId;
      case 30145: return (rMinV.vMinLoc >> 8) & 0xff;
      case 30146: return rMinV.vMinLoc & 0xff;
      case 30149: return s16(tmax.max * 10);
      case 30150: return s16(tavg * 10);
      case 30151: return s16(tmin.min * 10);
      case 30152: return tmax.maxId;
      case 30153: return (rMaxT.tMaxLoc >> 8) & 0xff;
      case 30154: return rMaxT.tMaxLoc & 0xff;
      case 30155: return tmin.minId;
      case 30156: return (rMinT.tMinLoc >> 8) & 0xff;
      case 30157: return rMinT.tMinLoc & 0xff;
      default: return 0;
    }
  };

  const rackWord = (r: Rack, off: number): number => {
    if (!r.rbmsUp || r.disabled || r.inj.rbmsCommLoss) return 0;
    if (off < RACK_SUMMARY_OFF) {
      switch (off) {
        case 0: return 0x0105;
        case 1: return 0x3203;
        case 2: return 0x1234;
        case 3: return 0x5678;
        case 4: return 0x0105;
        case 5: return 0x3203;
        case 6: return 0x0102;
        case 7: return 0x0304;
        case 8: return 0x4733; case 9: return 0x585f; case 10: return 0x5242; case 11: return 0x4d53;
        case 16: return u32words(1311110000 + r.id)[0];
        case 17: return u32words(1311110000 + r.id)[1];
        case 18: return 0x0001;
        case 19: return 0x0002;
        case 20: return 1;
        case 22: return 200;
        case 23: return PACKS_PER_RACK;
        case 24: return 2;
        case 25: return 4;
        case 27: return 2;
        case 28: return 2;
        case 29: return 14;
        case 32: return 0x0503;
        default: return 0;
      }
    }
    const s = off - RACK_SUMMARY_OFF;
    if (s >= 18 && s <= 33) return r.diag.word(s);
    if (s === 80) return r.diag.word(80);
    const st = r.stats();
    const lim = r.limits();
    switch (s) {
      case 0: return r.state;
      case 1: {
        let w = 0;
        if (r.balancingActive) w |= 1;
        if (r.diag.anyLevel("warning")) w |= 2;
        if (r.diag.anyLevel(["fault1", "fault2"])) w |= 4;
        const I = r.current;
        // Rev AF: b4..b3 = 00 idle, 01 deşarj, 10 şarj
        if (I > 0.5) w |= 0b10 << 3;
        else if (I < -0.5) w |= 0b01 << 3;
        if (r.diag.isActive("PDVF")) w |= 0b10 << 5;
        if (r.dcLineClosed) w |= 1 << 7;
        const ready = r.state === RACK_STATE.NORMAL && !r.diag.anyLevel(["fault1", "fault2"]);
        if (ready) w |= 1 << 8;
        if (lim.chargeKw < 222) w |= 1 << 9;
        w |= 1 << 10; // akım sensörü: network + hall
        return w;
      }
      case 2:
      case 3: {
        const st2 = (closed: boolean) => (closed ? 0b11 : 0b10);
        const fb = s === 3;
        const mcPlusFb = fb && r.inj.contactorFeedbackFail ? !r.mcPlus : r.mcPlus;
        let w = st2(r.pc) | (st2(mcPlusFb) << 2) | (st2(r.mcMinus) << 4) | (0b00 << 6) | ((r.fan ? 0b11 : 0b10) << 8) | ((r.fan ? 0b11 : 0b10) << 10) | ((r.fan ? 0b11 : 0b10) << 12);
        if (fb) w = (w & ~0b11) | ((r.inj.fuseBlown ? 0b10 : 0b11) << 14);
        return w & 0xffff;
      }
      case 4: return Math.floor(r.heartbeat) & 0xffff;
      case 5: return PACKS_PER_RACK;
      case 6: return u32words(r.balancingRemaining)[0];
      case 7: return u32words(r.balancingRemaining)[1];
      case 8: return Math.round(r.reportedSoc() * 100);
      case 9: return Math.round(r.soh * 100);
      case 10: return u32words(lim.chargeKw * 1000)[0];
      case 11: return u32words(lim.chargeKw * 1000)[1];
      case 12: return u32words(lim.dischargeKw * 1000)[0];
      case 13: return u32words(lim.dischargeKw * 1000)[1];
      case 14: return u32words(r.cellSum() * 10000)[0];
      case 15: return u32words(r.cellSum() * 10000)[1];
      case 16: return s32words(r.currentMeasured * 1000)[0];
      case 17: return s32words(r.currentMeasured * 1000)[1];
      case 34: return Math.round(st.vMax * 10000);
      case 35: return Math.round(st.vMin * 10000);
      case 36: return Math.round(st.vAvg * 10000);
      case 37: return st.vMaxLoc;
      case 38: return st.vMinLoc;
      case 39: return s16(st.tMax * 10);
      case 40: return s16(st.tMin * 10);
      case 41: return s16(st.tAvg * 10);
      case 42: return st.tMaxLoc;
      case 43: return st.tMinLoc;
      case 44: return Math.round(st.tDiffRack * 10);
      case 45: return Math.round(st.tDiffPack * 10);
      case 50: return r.mcOpenCount & 0xffff;
      case 51: return r.calibrationReq & 0xff;
      case 53: return Math.floor(r.nonBalancingDays);
      default: return 0;
    }
  };

  const bit = (table: "coil" | "discrete", addr: number): boolean | undefined => {
    if (table === "coil") return undefined;
    const N = bsc.racks.length;
    if (addr < 1 || addr > 6 * N) return undefined;
    const grp = Math.floor((addr - 1) / N);
    const r = bsc.racks[(addr - 1) % N]!;
    if (!bsc.commUp && grp > 0) return false;
    switch (grp) {
      case 0: return r.disabled;
      case 1: return r.online;
      case 2: return r.diag.anyLevel("alarm");
      case 3: return r.diag.anyLevel("warning");
      case 4: return r.diag.anyLevel(["fault1", "fault2"]);
      case 5: return r.nonBalancingDays > 30;
      default: return false;
    }
  };

  return simpleFace({
    word,
    bit,
    strictAddress: () => realism().fcStrict,
    writeWord: (addr, value) => {
      if (addr < 40000 || addr > 40200) return 2;
      bsc.writeHolding(addr, value);
      return 0;
    },
  });
}
