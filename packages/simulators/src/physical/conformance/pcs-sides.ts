import { EventLog } from "../core/events";
import { profileDefaults, timings } from "../core/profile";
import { wattoxEmsFace } from "../faces/wattox-face";
import { BMS_BASE, WattoxPcs } from "../models/pcs-wattox";
import { WattoxPcsSimulator } from "../../wattox-pcs/simulator";
import type { EquivalenceSide } from "./equivalence";

/**
 * PCS eşdeğerlik tarafları (UC-3) — süreç içi, ağ yok.
 *
 * EMS yüzü baz alınır (protokol V1.0: FC03 okuma / FC06 yazma). Fiziksel model
 * baraya sabit DC gerilimle beslenir (`dcVoltage`); gerçek kuplaj Plant'tadır.
 */
export interface PcsSideConfig {
  deviceId: string;
  dcVoltage?: number;
}

export const PCS_DC_VOLTAGE = 1360;

export function pcsLegacySide(config: PcsSideConfig): EquivalenceSide {
  const sim = new WattoxPcsSimulator({
    deviceId: config.deviceId,
    ratedPowerKw: 1725,
    ratedVoltageV: 690,
    ratedCurrentA: 1443,
    commandSource: 1,
  });
  return {
    read: (address, table) => (table === "input" ? sim.readRegister(address) : sim.readHolding(address)),
    write: (address, value) => sim.writeSetting(address, value),
    advance: (seconds) => {
      for (let i = 0; i < Math.round(seconds); i++) sim.tick(1);
    },
  };
}

export function pcsPhysicalSide(config: PcsSideConfig): EquivalenceSide {
  const events = new EventLog();
  const realism = profileDefaults("uyumlu");
  const R = () => realism;
  const T = () => timings(realism.timing);
  const dcVoltage = config.dcVoltage ?? PCS_DC_VOLTAGE;
  const pcs = new WattoxPcs(
    { id: config.deviceId, ratedKw: 1725, ratedV: 690, ratedA: 1443, dcMaxA: 1807, altitudeM: 0 },
    events,
    R,
    T,
  );
  const face = wattoxEmsFace(pcs, R, events);
  return {
    read: (address, table) => {
      try {
        const words = face.readWords(table ?? "holding", address, 1) as number[];
        return words[0];
      } catch {
        return undefined;
      }
    },
    write: (address, value) => {
      try {
        face.writeWords(address, [value], 6);
      } catch {
        /* adres EMS yüzünde yok — harness farkı zaten görür */
      }
    },
    advance: (seconds) => {
      for (let i = 0; i < Math.round(seconds); i++) {
        // Connector rolü: BMS bloğu her saniye tazelenir (link canlı kalır).
        // +0x08/+0x09 = şarj/deşarj izinli güç (0,1 kW) — anma gücü kadar.
        pcs.writeBms(BMS_BASE + 0x08, 17250);
        pcs.writeBms(BMS_BASE + 0x09, 17250);
        pcs.step(1, dcVoltage, 0);
      }
    },
  };
}
