// MC90 HVAC yüzü, mevcut (packages/simulators) simülatörleri saran "legacy" yüz ve
// BSC→PCS konnektör izleme yüzü.

import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import type { Realism } from "../core/profile";
import type { Mc90Hvac } from "../models/hvac-mc90";
import type { DeviceFace } from "../modbus/lab-server";
import { simpleFace } from "./face-base";

export function hvacFace(h: Mc90Hvac, realism: () => Realism): DeviceFace {
  return simpleFace({
    word: (_t, a) => h.read(a),
    strictAddress: () => realism().fcStrict,
    writeWord: (addr, value) => {
      const r = h.write(addr, value);
      return r > 0 ? r : 0;
    },
  });
}

/** packages/simulators adapter'ını DeviceFace'e çevirir (async). */
export function legacyFace(adapter: IModbusSimulatorAdapter): DeviceFace {
  return {
    readWords: (t, a, c) => (t === "holding" ? adapter.readHoldingRegisters(a, c) : adapter.readInputRegisters(a, c)),
    readBits: (t, a, c) => (t === "coil" ? adapter.readCoils(a, c) : adapter.readDiscreteInputs(a, c)),
    writeWords: (a, v) => (v.length === 1 ? adapter.writeHoldingRegister(a, v[0]!) : adapter.writeHoldingRegisters(a, v)),
    writeBits: (a, v) => (v.length === 1 ? adapter.writeCoil(a, v[0]!) : adapter.writeMultipleCoils(a, v)),
  };
}

export interface ConnectorStats {
  link: number;
  source: number;
  lastWriteAt: number;
  writeCount: number;
  failCount: number;
}

export function connectorFace(s: () => ConnectorStats): DeviceFace {
  return simpleFace({
    word: (_t, a) => {
      const x = s();
      switch (a) {
        case 0: return x.link;
        case 1: return x.source;
        case 2: return x.lastWriteAt & 0xffff;
        case 3: return (x.lastWriteAt >>> 16) & 0xffff;
        case 4: return x.writeCount & 0xffff;
        case 5: return (x.writeCount >>> 16) & 0xffff;
        case 6: return x.failCount & 0xffff;
        case 7: return (x.failCount >>> 16) & 0xffff;
        default: return 0;
      }
    },
    strictAddress: () => false,
  });
}
