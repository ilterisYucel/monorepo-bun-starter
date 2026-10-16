import { bscSource, calcSource, nomapSource, pcsSource, rackSource, type RegisterSource } from "./register-sources";

/**
 * Mimic SVG metin id → register kaynağı eşlemesi (SPEC UC-12, FR-12.5).
 *
 * `nova-mimic.ts` her metin öğesine `<prefix><...>` biçiminde bir id verir
 * (`nm{instance}_3At1` gibi). Bu modül, referans `app.js#srcForId` portu olarak
 * o id'yi bir `RegisterSource`'a çözer; `DemoMimic` regmodda `data-rsk` yazar.
 *
 * Cihaz etiketleri demo-field gerçeğine göre verilir: tek konteyner 9 gruba
 * fan-out edildiğinden fiziksel cihazlar `BSC-1/BSC-2`, `PCS-1/PCS-2`'dir;
 * grup numarası yalnızca kart bağlamı olarak taşınır.
 *
 * Saf: IO/zaman yok; bilinmeyen id → `null`.
 */

export interface MimicDeviceMap {
  bsc: (bank: string) => string;
  pcs: (bank: string) => string;
  /** MV / POI / feeder / AUX gibi haritası olmayan saha cihazları. */
  mv: string;
  aux: string;
}

export const DEFAULT_MIMIC_DEVICES: MimicDeviceMap = {
  bsc: (b) => (b === "B" ? "BSC-2" : "BSC-1"),
  pcs: (b) => (b === "B" ? "PCS-2" : "PCS-1"),
  mv: "DEMO-MV-1",
  aux: "PM5340-1",
};

export function mimicSourceForId(
  id: string,
  map: MimicDeviceMap = DEFAULT_MIMIC_DEVICES,
): RegisterSource | null {
  const bare = id.replace(/^nm\d+_/, "");
  let m: RegExpExecArray | null;

  if ((m = /^(\d+)([AB])(t1|t2|ps|pp|pt)$/.exec(bare))) {
    const n = +m[1]!;
    const bank = m[2]!;
    const kind = m[3]!;
    if (kind === "t1") {
      const s = calcSource("SOC · SOH", [
        bscSource(map.bsc(bank), "bank.soc", { bank, group: n }),
        bscSource(map.bsc(bank), "bank.soh", { bank, group: n }),
      ]);
      return { ...s, group: n };
    }
    if (kind === "t2") {
      const s = calcSource("DC voltage · max pack temperature", [
        bscSource(map.bsc(bank), "bank.vdc", { bank, group: n }),
        bscSource(map.bsc(bank), "bank.tmax", { bank, group: n }),
      ]);
      return { ...s, group: n };
    }
    if (kind === "ps") return { ...pcsSource(map.pcs(bank), "pcs.state", { bank, group: n }), group: n };
    if (kind === "pp") return { ...pcsSource(map.pcs(bank), "pcs.p", { bank, group: n }), group: n };
    return { ...pcsSource(map.pcs(bank), "pcs.igbt", { bank, group: n }), group: n };
  }

  if ((m = /^(\d+)([AB])r(\d+)$/.exec(bare))) {
    const n = +m[1]!;
    const bank = m[2]!;
    const rackNo = +m[3]! + 1;
    return { ...rackSource(map.bsc(bank), rackNo, "rack.tMax", { bank, group: n }), group: n };
  }

  if ((m = /^ust(\d+)$/.exec(bare))) {
    const n = +m[1]!;
    const s = calcSource("PMS group status", [
      bscSource(map.bsc("A"), "bank.state", { bank: "A", group: n }),
      pcsSource(map.pcs("A"), "pcs.state", { bank: "A", group: n }),
    ]);
    return { ...s, group: n };
  }

  if (bare === "poiTxt") return nomapSource(map.mv, "POI active power, current and voltage");
  if (bare === "vtTxt" || bare === "hzTxt") return nomapSource(map.mv, "metering voltage and frequency");
  if (bare === "auxTxt") return nomapSource(map.aux, "AUX active power");
  if ((m = /^fd([AB])txt$/.exec(bare))) return nomapSource(map.mv, `feeder ${m[1]!} active power and current`);
  if (/^H\d\dI$/.test(bare)) return nomapSource(map.mv, "protection relay phase current");

  return null;
}
