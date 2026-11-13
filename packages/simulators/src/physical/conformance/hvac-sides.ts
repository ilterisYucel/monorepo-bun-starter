import { EventLog } from "../core/events";
import { profileDefaults, timings } from "../core/profile";
import { hvacFace } from "../faces/misc-faces";
import { Mc90Hvac } from "../models/hvac-mc90";
import { HvacSimulator } from "../../hvac/hvac-simulator";
import type { EquivalenceSide } from "./equivalence";

/**
 * HVAC eşdeğerlik tarafları (UC-4) — süreç içi, ağ yok.
 *
 * Protokol MC90HDNC1R-L: FC03 okuma / FC06-10 yazma. Legacy sınıf ölçümleri
 * input, ayarları holding tablosunda tutar; fiziksel yüz tek adres uzayı sunar.
 */
export interface HvacSideConfig {
  deviceId: string;
}

export function hvacLegacySide(config: HvacSideConfig): EquivalenceSide {
  const sim = new HvacSimulator({ deviceId: config.deviceId });
  return {
    read: (address, table) =>
      table === "input" ? sim.readInputRegister(address) : sim.readHoldingRegister(address),
    write: (address, value) => sim.writeHoldingRegister(address, value),
    advance: (seconds) => {
      for (let i = 0; i < Math.round(seconds); i++) sim.tick(1);
    },
  };
}

export function hvacPhysicalSide(config: HvacSideConfig): EquivalenceSide {
  const events = new EventLog();
  const realism = profileDefaults("uyumlu");
  const R = () => realism;
  const T = () => timings(realism.timing);
  const hvac = new Mc90Hvac({ id: config.deviceId, coolingKw: 90, heaterKw: 12 }, events, R, T);
  let simT = 0;
  const face = hvacFace(hvac, R);
  return {
    read: (address) => {
      try {
        const words = face.readWords("holding", address, 1) as number[];
        return words[0];
      } catch {
        return undefined;
      }
    },
    write: (address, value) => {
      try {
        face.writeWords(address, [value], 6);
      } catch {
        /* adres yüzde yok — harness farkı zaten görür */
      }
    },
    advance: (seconds) => {
      for (let i = 0; i < Math.round(seconds); i++) {
        simT += 1;
        hvac.step(1, simT, 25, 20);
      }
    },
  };
}
