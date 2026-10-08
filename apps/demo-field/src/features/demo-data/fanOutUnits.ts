import type { NovaUnitState } from "@gd-monorepo/ui";

/**
 * Sanal filo fan-out (SPEC K6, FR-2.1). Tek gerçek ünite prototipini N sanal
 * üniteye **birebir** çoğaltır — sunumsal varyasyon YOKTUR (gerçek değer %50
 * ise altı ünitenin hepsi %50 gösterir; sahanın gerçek davranışı budur).
 * Yalnızca PCS gücü N'e bölünür → filo toplamı gerçek kalır (×N şişme olmaz).
 */
export function fanOutUnits(
  proto: Omit<NovaUnitState, "n">,
  count: number,
): NovaUnitState[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("fanOutUnits: count pozitif tam sayi olmali");
  }
  const out: NovaUnitState[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      n: i + 1,
      rmu: { ...proto.rmu },
      ...(proto.status ? { status: proto.status } : {}),
      banks: proto.banks.map((b) => ({
        ...b,
        racks: [...b.racks],
        ...(b.rackSoc ? { rackSoc: [...b.rackSoc] } : {}),
        ...(b.rackV ? { rackV: [...b.rackV] } : {}),
        ...(b.rackI ? { rackI: [...b.rackI] } : {}),
      })),
      pcs: proto.pcs.map((p) => ({
        ...p,
        pMW: p.pMW / count,
        ...(p.faultWords ? { faultWords: [...p.faultWords] } : {}),
      })),
      ...(proto.hvac
        ? { hvac: proto.hvac.map((h) => ({ ...h, alarms: [...h.alarms] })) }
        : {}),
      ...(proto.aux ? { aux: { ...proto.aux } } : {}),
      ...(proto.fss
        ? {
            fss: {
              ...proto.fss,
              zones: proto.fss.zones.map((z) => ({ ...z })),
              detectors: proto.fss.detectors.map((d) => ({ ...d })),
            },
          }
        : {}),
      ...(proto.imdMOhm !== undefined ? { imdMOhm: proto.imdMOhm } : {}),
      ...(proto.dc ? { dc: { ...proto.dc } } : {}),
    });
  }
  return out;
}
