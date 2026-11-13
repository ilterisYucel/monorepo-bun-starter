import { BSCSimulator } from "../../bsc/bsc-simulator";
import { EventLog } from "../core/events";
import { profileDefaults, timings } from "../core/profile";
import { bscFace } from "../faces/bsc-face";
import { Bsc } from "../models/bsc";
import type { EquivalenceSide } from "./equivalence";

/**
 * BSC eşdeğerlik tarafları (UC-1) — süreç içi, ağ yok.
 *
 * - `bscLegacySide`: bugünkü legacy `BSCSimulator` (karşılaştırma tabanı).
 * - `bscPhysicalSide`: fiziksel `Bsc` modeli + `bscFace` register yüzü.
 *
 * `uyumlu` profil kullanılır (SPEC A2 — eşdeğerlik bazı).
 */
export interface BscSideConfig {
  deviceId: string;
  rackCount: number;
  initialSocPercent?: number;
  initialTempC?: number;
}

export function bscLegacySide(config: BscSideConfig): EquivalenceSide {
  const sim = new BSCSimulator({
    deviceId: config.deviceId,
    rackCount: config.rackCount,
    registers: [],
    ...(config.initialSocPercent !== undefined ? { initialSocPercent: config.initialSocPercent } : {}),
  });
  return {
    read: (address, table) => (table === "holding" ? sim.readHoldingRegister(address) : sim.readInputRegister(address)),
    write: (address, value) => sim.writeHoldingRegister(address, value),
    advance: (seconds) => {
      for (let i = 0; i < Math.round(seconds); i++) sim.tick(1);
    },
  };
}

export function bscPhysicalSide(config: BscSideConfig): EquivalenceSide {
  const events = new EventLog();
  const realism = profileDefaults("uyumlu");
  const R = () => realism;
  const T = () => timings(realism.timing);
  const bsc = new Bsc(
    {
      id: config.deviceId,
      rackCount: config.rackCount,
      seed: 1,
      initialSoc: config.initialSocPercent ?? 50,
      initialTemp: config.initialTempC ?? 25,
      closeDeviationV: 20,
    },
    events,
    R,
    T,
  );
  const face = bscFace(bsc, R, () => 200, events);
  let simT = 0;
  return {
    read: (address, table) => {
      try {
        // bscFace senkron yüz (simpleFace) — sözleşme tipi Promise'a da izin verir.
        const words = face.readWords(table ?? "input", address, 1) as number[];
        return words[0];
      } catch {
        return undefined;
      }
    },
    write: (address, value) => {
      try {
        face.writeWords(address, [value], 6);
      } catch {
        /* adres fiziksel yüzde yok — harness farkı zaten görür */
      }
    },
    advance: (seconds) => {
      for (let i = 0; i < Math.round(seconds); i++) {
        simT += 1;
        bsc.step(1, simT, 0);
      }
    },
  };
}
