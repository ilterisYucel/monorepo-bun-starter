import type { NovaMimicState, NovaTopology } from "@gd-monorepo/ui";
import { POS_TEXT } from "@gd-monorepo/ui";

/**
 * Uyarı türevi (SPEC UC-4/T-15, FR-4.2). Saf; severity sırasına göre sıralı.
 */

export type NovaAlertSeverity = "alarm" | "warn" | "cold" | "maint" | "info";

export interface NovaAlert {
  sev: NovaAlertSeverity;
  title: string;
  desc: string;
  value: string;
  unitNo?: number;
  cell?: string;
}

export const SEV_RANK: Record<NovaAlertSeverity, number> = {
  alarm: 0,
  warn: 1,
  cold: 2,
  maint: 3,
  info: 4,
};

export const SEV_TEXT: Record<NovaAlertSeverity, string> = {
  alarm: "KRİTİK",
  warn: "UYARI",
  cold: "SOĞUK",
  maint: "BAKIM",
  info: "BİLGİ",
};

const f = (v: number, d = 1): string =>
  (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(".", ",");

export function deriveAlerts(
  state: NovaMimicState,
  topo: NovaTopology,
): NovaAlert[] {
  const L = topo.limits;
  const out: NovaAlert[] = [];

  for (const c of topo.station.cells) {
    const pos = state.station[c.id as "H01" | "H02" | "H04" | "H05"];
    if (c.kind === "cb" && pos && pos !== "closed") {
      out.push({
        sev: "warn",
        cell: c.id,
        title: `${c.id} kesici açık`,
        desc: c.role === "incomer" ? "Saha şebekeden ayrık" : `Fider ${c.feeder} enerjisiz`,
        value: "",
      });
    }
    if (c.es && state.station.es?.[c.id]) {
      out.push({
        sev: "maint",
        cell: c.id,
        title: `${c.id} toprak ayırıcısı kapalı`,
        desc: "Kablo topraklı · kesici kilitli",
        value: "",
      });
    }
  }

  state.units.forEach((u) => {
    const maint = u.rmu.H02 !== "closed" && u.rmu.es;
    if (maint) {
      out.push({
        sev: "maint",
        unitNo: u.n,
        title: `BESS#${u.n} bakımda`,
        desc: "RMU H02 açık, toprak ayırıcı kapalı",
        value: "",
      });
    }
    u.pcs.forEach((p, i) => {
      if (p.state === "fault") {
        out.push({
          sev: "alarm",
          unitNo: u.n,
          title: `PCS-${u.n}${p.id} arıza`,
          desc: `DC kesici ${u.banks[i]?.id ?? ""} ${POS_TEXT[u.banks[i]?.dcb ?? "closed"].toLowerCase()}`,
          value: `${f(p.igbtC, 0)} °C`,
        });
      }
      if (p.limited && (p.state === "chg" || p.state === "dis")) {
        out.push({
          sev: "warn",
          unitNo: u.n,
          title: `PCS-${u.n}${p.id} güç sınırlı`,
          desc: `Sıcaklık koruması · %50 · ${L.derateReleaseC} °C altında kalkar`,
          value: `${f(p.pMW, 2)} MW`,
        });
      }
    });
    u.banks.forEach((b) => {
      if (b.tmax > L.tempMax) {
        out.push({
          sev: "alarm",
          unitNo: u.n,
          title: `BESS#${u.n}-${b.id} sıcaklık yüksek`,
          desc: `Bant ${L.tempMin}–${L.tempMax} °C`,
          value: `${f(b.tmax)} °C`,
        });
      } else if ((b.dTdt10 ?? 0) >= L.dTdtWarn) {
        out.push({
          sev: "warn",
          unitNo: u.n,
          title: `BESS#${u.n}-${b.id} hızlı sıcaklık artışı`,
          desc: `ΔT/10 dk +${f(b.dTdt10 ?? 0)} °C`,
          value: `${f(b.tmax)} °C`,
        });
      }
      if ((b.tmin ?? b.tmax) < L.tempMin) {
        out.push({
          sev: "cold",
          unitNo: u.n,
          title: `BESS#${u.n}-${b.id} sıcaklık düşük`,
          desc: maint ? "Ünite enerjisiz, HVAC çalışmıyor" : "Bant altı · HVAC kontrol edilmeli",
          value: `${f(b.tmin ?? b.tmax)} °C`,
        });
      }
      if (b.dvmV >= L.dvWarn) {
        out.push({
          sev: "warn",
          unitNo: u.n,
          title: `BESS#${u.n}-${b.id} hücre dengesizliği`,
          desc: `Hücre ΔV eşik ${L.dvWarn} mV`,
          value: `${f(b.dvmV, 0)} mV`,
        });
      }
    });
    const soh = Math.min(...u.banks.map((b) => b.soh));
    if (soh < L.sohInfo) {
      out.push({
        sev: "info",
        unitNo: u.n,
        title: `BESS#${u.n} SOH düşük`,
        desc: "Kalibrasyon ile kapasite ölçümü önerilir",
        value: `${f(soh)} %`,
      });
    }
  });

  return out.sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev]);
}
