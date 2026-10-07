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
      banks: proto.banks.map((b) => ({ ...b, racks: [...b.racks] })),
      pcs: proto.pcs.map((p) => ({ ...p, pMW: p.pMW / count })),
    });
  }
  return out;
}
