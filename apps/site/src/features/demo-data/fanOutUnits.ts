import type { NovaUnitState } from "@gd-monorepo/ui";

/**
 * Sanal filo fan-out (SPEC K6, FR-2.1). Tek gerçek ünite prototipini N sanal
 * üniteye **birebir** çoğaltır — sunumsal varyasyon YOKTUR (gerçek değer %50
 * ise altı ünitenin hepsi %50 gösterir; sahanın gerçek davranışı budur).
 * 2026-10-15 dağıtım kuralı: FL-02 gücü istasyondaki PCS sayısına bölünür ve
 * HER PCS aynı setpoint'i alır. Gerçek PCS çifti bir grubu temsil eder; diğer
 * gruplar onun kopyasıdır → P / I / limitler BÖLÜNMEZ (istasyon toplamı =
 * grup sayısı × 2 × PCS gücü = istenen MW).
 * İlk ünite dışındakiler `mirrored: true` taşır (kendi cihazı yok — UI etiketler).
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
      ...(i > 0 ? { mirrored: true } : {}),
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
        pMW: p.pMW,
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
