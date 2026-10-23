// Wattox MPCS Modbus yüzleri:
//  • EMS yüzü (connection.port): A/B/C/D parametreleri (RO) + S ayarları (R/W).
//    Protokol V1.0 yalnız FC03 (okuma) ve FC06 (yazma) tanımlar — EMS FC04/FC16 kullanırsa uyarı.
//  • BMS yüzü (bmsPort): 0x0300–0x0316 BMS bloğu R/W; blok dışı 0x02.

import { s16, toSigned16 } from "../core/util";
import type { EventLog } from "../core/events";
import type { Realism } from "../core/profile";
import { BMS_BASE, BMS_SIZE, OP, type WattoxPcs } from "../models/pcs-wattox";
import { simpleFace, internalRead } from "./face-base";
import { ModbusError, type DeviceFace } from "../modbus/lab-server";

export function wattoxEmsFace(p: WattoxPcs, realism: () => Realism, events: EventLog): DeviceFace {
  const word = (_t: "holding" | "input", a: number): number | undefined => {
    if (!internalRead.active) p.emsLastRequestWall = Date.now();
    if (a >= BMS_BASE && a < BMS_BASE + BMS_SIZE) return p.bms[a - BMS_BASE]!;
    if (a >= 0x2fb5 && a <= 0x2fbe) return p.faults[a - 0x2fb5]!;
    if (a >= 0x2fbf && a <= 0x2fc6) return p.alarms[a - 0x2fbf]!;
    if (p.settings.has(a)) return p.settings.get(a)!;
    const op = p.opStatus;
    const closed = (b: boolean): number => (b ? 0 : 1);
    const energ = p.acBreakerClosed;
    const vLL = energ || p.phase === "softstart" ? p.grid.vLL : p.grid.present ? p.grid.vLL : 0;
    const iPh = energ ? (p.apparentKva() * 1000) / (Math.sqrt(3) * Math.max(1, p.grid.vLL)) : 0;
    const maxP = Math.round(p.maxActiveKw());
    switch (a) {
      case 0x2f00: return 10203; case 0x2f01: return 0; case 0x2f03: return 10105; case 0x2f04: return 0;
      case 0x2f05: return 10007; case 0x2f06: return 0; case 0x2f07: return 100; case 0x090e: return 101;
      case 0x2f08: return p.cfg.ratedKw;
      case 0x2f09: return p.cfg.ratedV;
      case 0x2f0a: return p.cfg.ratedA;
      case 0x0123: return s16(-maxP);
      case 0x0124: return maxP;
      case 0x0126: return Math.round(p.cfg.ratedKw * 1.05);
      case 0x0125: return s16(-Math.round(p.cfg.ratedKw * 1.05));
      case 0x0127: return s16(-p.cfg.dcMaxA);
      case 0x0128: return p.cfg.dcMaxA;
      case 0x2f0f: return 7590;
      case 0x2f10: return 6210;
      case 0x0117: return 15000;
      case 0x0118: return 10000;
      case 0x2f2e: return Math.round(p.allowableDischargeKw());
      case 0x2f2f: return Math.round(p.allowableChargeKw());
      case 0x2f7d: return op;
      case 0x2f5a: return (1 << op) | (p.alarmActive() ? 1 << 7 : 0);
      case 0x2f43: return p.faultActive() ? 1 : 0;
      case 0x2f45: return p.alarmActive() ? 1 : 0;
      case 0x2f3d: return op === OP.CHARGING ? 1 : 0;
      case 0x2f3e: return op === OP.DISCHARGING ? 1 : 0;
      case 0x2f40: return p.phase === "run" || p.phase === "standby" ? 1 : 0;
      case 0x2f48: return s16(p.dcVoltage * 10);
      case 0x2f49: return s16(p.dcCurrent);
      case 0x2f4e: return Math.round((p.grid.present ? p.grid.hz : 0) * 100);
      case 0x2f4d: return s16(p.pDc);
      case 0x2f53: { const s = p.apparentKva(); return s16(s < 1 ? 0 : (Math.abs(p.pAc) / s) * 1000 * (p.qAc < 0 ? -1 : 1)); }
      case 0x2f46: case 0x2f47: return s16((p.dcVoltage / 2) * 10);
      case 0x2f7e: return s16(p.pAc);
      case 0x2f7f: return s16(p.qAc);
      case 0x2f52: return s16(p.apparentKva());
      case 0x2f4f: return Math.round(vLL * 10);
      case 0x2f50: return Math.round(vLL * 10 * 1.002);
      case 0x2f51: return Math.round(vLL * 10 * 0.998);
      case 0x2f4a: return Math.round(iPh);
      case 0x2f4b: return Math.round(iPh * 1.01);
      case 0x2f4c: return Math.round(iPh * 0.99);
      case 0x2018: case 0x2019: case 0x201a: return energ ? Math.round(p.grid.vLL * 10) : 0;
      case 0x2f59: return p.derated;
      case 0x2f5b: return closed(p.acBreakerClosed);
      case 0x2f5d: return closed(p.acPrecharge);
      case 0x2f5c: return closed(p.dcBreakerClosed);
      case 0x2f5e: return closed(p.dcPrecharge);
      case 0x2f84: return closed(p.dcBreakerClosed);
      case 0x2f85: return closed(p.dcPrecharge);
      case 0x2f60: return (p.estop.local ? 1 : 0) | (p.estop.remote ? 2 : 0) | (p.estop.bms ? 4 : 0);
      case 0x2f54: return s16(p.igbt[0]! * 10);
      case 0x2f55: return s16(p.igbt[1]! * 10);
      case 0x2f56: return s16(p.igbt[2]! * 10);
      case 0x2f80: return s16(p.igbt[3]! * 10);
      case 0x2f81: return s16(p.igbt[4]! * 10);
      case 0x2f82: return s16(p.igbt[5]! * 10);
      case 0x2f58: return s16(p.reactor[0]! * 10);
      case 0x2f83: return s16(p.reactor[1]! * 10);
      case 0x2028: return s16(p.filterCap * 10);
      case 0x2027: return s16(p.cavity * 10);
      case 0x202f: return s16(p.humidity * 10);
      case 0x2f57: return s16(p.ambientC * 10);
      case 0x2f5f: case 0x2f86: return 0;
      case 0x2f6a: case 0x2f87: return Math.min(65535, Math.round(p.insulationKohm));
      case 0x2f61: return p.coolingFail ? 3 : p.phase === "run" || p.phase === "standby" ? 0 : 1;
      case 0x2f63: return p.coolingFail ? 1 : 0;
      case 0x2f62: return p.coolingFail ? 0x00c0 : 0;
      case 0x205b: case 0x30c0: return p.doorOpen ? 1 : 0;
      case 0x2f64: return Math.floor(p.accDischargeKwh) & 0xffff;
      case 0x2f65: return (Math.floor(p.accDischargeKwh) >>> 16) & 0xffff;
      case 0x2f66: return Math.floor(p.accChargeKwh) & 0xffff;
      case 0x2f67: return (Math.floor(p.accChargeKwh) >>> 16) & 0xffff;
      case 0x2f68: return Math.floor(p.dailyDischargeKwh) & 0xffff;
      case 0x2f69: return Math.floor(p.dailyChargeKwh) & 0xffff;
      case 0x090f: case 0x0910: return 101;
      case 0x0103: return 100;
      // C — haberleşme parametreleri
      case 0x0a00: return 1; case 0x0a01: return 1; case 0x0a02: return 1; case 0x0a08: return 0;
      case 0x0a19: return p.emsTimeoutS; case 0x0a1b: return 0;
      case 0x0b00: return 1; case 0x0b01: return 1; case 0x0b02: return 1; case 0x0b19: return p.bmsTimeoutS;
      case 0x0b1b: return p.bmsLinkOk() ? 0 : 1;
      case 0x0b1e: return 3; case 0x0b20: return 4; case 0x0b21: return p.bmsTimeoutS; case 0x0b22: return 0;
      case 0x0b23: case 0x0b24: case 0x0b25: return 0; case 0x0b26: return p.bmsLinkOk() ? 0 : 1;
      default: return undefined;
    }
  };
  return simpleFace({
    word,
    strictAddress: () => realism().fcStrict,
    writeWord: (addr, value, fc) => {
      p.emsLastRequestWall = Date.now();
      if (fc === 16) events.compatWarn(p.cfg.id, "fc16", "EMS FC16 (çoklu yazma) kullanıyor", "Wattox protokol V1.0 yalnız FC06 tanımlar (0x86 exception) — cihazla teyit edilmeli");
      if (addr >= BMS_BASE && addr < BMS_BASE + BMS_SIZE) return realism().fcStrict ? 2 : 0; // EMS yüzü BMS bloğu RO
      if (!p.settings.has(addr)) {
        if (realism().fcStrict) return 2;
        events.compatWarn(p.cfg.id, `wUnknown${addr}`, `Tanımsız/RO adrese yazım (0x${addr.toString(16)})`, "Invalid data address (0x02)");
        return 0;
      }
      return p.writeSetting(addr, value);
    },
  });
}

export function wattoxBmsFace(p: WattoxPcs, onWrite?: () => void): DeviceFace {
  const inBlock = (a: number): boolean => a >= BMS_BASE && a < BMS_BASE + BMS_SIZE;
  return {
    readWords(_t, addr, count) {
      const out: number[] = [];
      for (let i = 0; i < count; i++) {
        if (!inBlock(addr + i)) throw new ModbusError(2);
        out.push(p.bms[addr + i - BMS_BASE]!);
      }
      return out;
    },
    readBits() {
      throw new ModbusError(1);
    },
    writeWords(addr, values) {
      for (let i = 0; i < values.length; i++) if (!inBlock(addr + i)) throw new ModbusError(2);
      values.forEach((v, i) => p.writeBms(addr + i, v));
      onWrite?.();
    },
    writeBits() {
      throw new ModbusError(1);
    },
  };
}

export { toSigned16 };
