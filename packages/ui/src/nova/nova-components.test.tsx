import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DemoCellDialog } from "./DemoCellDialog";
import { DemoContainerScada } from "./DemoContainerScada";
import {
  DEMO_DEVICE_TABS,
  DemoBatteryPanel,
} from "./DemoDevicePanels";
import { DemoFaultList, DemoFaultResolve } from "./DemoFaultList";
import type { DemoFault } from "./DemoFaultList";
import { DemoEventLog } from "./DemoEventLog";
import { DemoUnitDetail } from "./DemoUnitDetail";
import type { NovaCellConfig, NovaStationState, NovaTopology, NovaUnitState } from "./mimic-types";

const station = (over: Partial<NovaStationState> = {}): NovaStationState => ({
  H01: "closed",
  H02: "closed",
  H04: "closed",
  H05: "closed",
  kV: 34.5,
  hz: 50,
  es: { H01: false, H04: false, H05: false },
  iA: { H01: 120, H03: 120, H04: 60, H05: 60 },
  ...over,
});

const cbCell: NovaCellConfig = { id: "H05", label: "Fider A kesici", kind: "cb", role: "feeder", feeder: "A", es: true, ct: "300/5" };
const vtCell: NovaCellConfig = { id: "H03", label: "Ölçü", kind: "vt", role: "measurement", ct: "750/5" };

describe("DemoCellDialog (FR-4.4 / AK-4.4)", () => {
  it("ölçü hücresinde V/Hz/I gösterir", () => {
    render(<DemoCellDialog cell={vtCell} station={station()} onClose={() => {}} />);
    expect(screen.getByText("34,50 kV")).toBeTruthy();
    expect(screen.getByText("50,00 Hz")).toBeTruthy();
    expect(screen.getByText("120 A")).toBeTruthy();
  });

  it("toprak kapalıyken kesici kapatmayı kilitler (AK-4.5)", () => {
    render(
      <DemoCellDialog
        cell={cbCell}
        station={station({ es: { H01: false, H04: false, H05: true } })}
        onClose={() => {}}
      />,
    );
    const closeBtn = screen.getByRole("button", { name: /Kesiciyi kapat/ });
    expect((closeBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("geçerli komutta onCommand'ı çağırır", () => {
    const onCommand = vi.fn();
    render(
      <DemoCellDialog cell={cbCell} station={station()} onClose={() => {}} onCommand={onCommand} />,
    );
    const openBtn = screen.getByRole("button", { name: /Kesiciyi aç/ });
    openBtn.click();
    expect(onCommand).toHaveBeenCalledWith("H05", "cb_open");
  });
});

const unit: NovaUnitState = {
  n: 3,
  rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
  banks: [
    { id: "A", soc: 60, soh: 98, vdc: 1300, tmax: 24, dvmV: 10, racks: [24, 23], dcb: "closed" },
    { id: "B", soc: 55, soh: 97, vdc: 1290, tmax: 23, dvmV: 12, racks: [23, 22], dcb: "closed" },
  ],
  pcs: [
    { id: "A", state: "dis", pMW: 0.2, igbtC: 45, limited: false },
    { id: "B", state: "stby", pMW: 0, igbtC: 40, limited: false },
  ],
};

const topo = { limits: { socMin: 3.5, socMax: 97, tempMin: 19, tempMax: 25, derateC: 28, derateReleaseC: 24, dTdtWarn: 2, dvWarn: 50, sohInfo: 95 }, unit: { banks: ["A", "B"] } } as unknown as NovaTopology;

describe("DemoUnitDetail (FR-4.3 / AK-4.3)", () => {
  it("2 PCS ve 2 banka tablosu gösterir", () => {
    render(<DemoUnitDetail unit={unit} topology={topo} />);
    expect(screen.getByText("BESS#3")).toBeTruthy();
    expect(screen.getByText("PCS-3A")).toBeTruthy();
    expect(screen.getByText("PCS-3B")).toBeTruthy();
    expect(screen.getByText("Banka A")).toBeTruthy();
    expect(screen.getByText("Banka B")).toBeTruthy();
  });
});

const scadaTopo = {
  limits: { socMin: 3.5, socMax: 97, tempMin: 19, tempMax: 25, derateC: 28, derateReleaseC: 24, dTdtWarn: 2, dvWarn: 50, sohInfo: 95 },
  unit: {
    banks: ["A", "B"],
    racksPerBank: 8,
    trKVA: 3750,
    trVector: "Dy11y11",
    trRatio: "34,5/0,69 kV",
    lvLabel: "690 V",
    bus: { ratingA: 2000, rackFuseA: 220, dcCB: "SYW6GZ-4000", imd: "Bender isoPV1685RTU" },
    sections: [
      { id: 1, bank: "A", racks: [1, 2, 3, 4], hvac: [1, 2] },
      { id: 2, bank: "A", racks: [5, 6, 7, 8], hvac: [3, 4] },
      { id: 3, bank: "B", racks: [9, 10, 11, 12], hvac: [5, 6] },
      { id: 4, bank: "B", racks: [13, 14, 15, 16], hvac: [7, 8] },
    ],
    fss: { panel: "Sigma XT (K11031M2)" },
  },
} as unknown as NovaTopology;

const scadaUnit: NovaUnitState = {
  n: 1,
  rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
  banks: [
    { id: "A", soc: 60, soh: 98, vdc: 1300, tmax: 24, dvmV: 10, racks: [24, 23, 24, 22, 24, 23, 24, 22], dcb: "closed" },
    { id: "B", soc: 55, soh: 97, vdc: 1290, tmax: 23, dvmV: 12, racks: [23, 22, 23, 22, 23, 22, 23, 22], dcb: "closed" },
  ],
  pcs: [
    { id: "A", state: "chg", pMW: 0.3, igbtC: 44, limited: false },
    { id: "B", state: "stby", pMW: 0, igbtC: 40, limited: false },
  ],
};

describe("DemoContainerScada (UC-4, FR-4.1..4.3)", () => {
  it("AK-4.1: 2 DC bara × 8 raf gösterir", () => {
    render(<DemoContainerScada unit={scadaUnit} topology={scadaTopo} />);
    expect(screen.getByText("DC BUS#1 · 2000 A · sigorta 220 A")).toBeTruthy();
    expect(screen.getByText("DC BUS#2 · 2000 A · sigorta 220 A")).toBeTruthy();
    expect(screen.getAllByTestId("scada-rack")).toHaveLength(16);
  });

  it("AK-4.2: 2 PCS ve DC kesici gösterir", () => {
    render(<DemoContainerScada unit={scadaUnit} topology={scadaTopo} />);
    expect(screen.getAllByTestId("scada-pcs")).toHaveLength(2);
    expect(screen.getByText("PCS-A")).toBeTruthy();
    expect(screen.getByText(/DC CB 1 · /)).toBeTruthy();
  });

  it("AK-4.3: 4 HVAC bölümü ve FSS paneli gösterir", () => {
    render(<DemoContainerScada unit={scadaUnit} topology={scadaTopo} />);
    expect(screen.getAllByTestId("scada-section")).toHaveLength(4);
    expect(screen.getByText("Sigma XT (K11031M2)")).toBeTruthy();
  });

  it("dummy konteyner-butonu render edilir ve onOpen çağırır", () => {
    const onOpen = vi.fn();
    render(<DemoContainerScada unit={scadaUnit} topology={scadaTopo} onOpen={onOpen} />);
    const btn = screen.getByTestId("scada-open-container");
    expect(btn.textContent).toBe("Konteyner ekranını aç");
    fireEvent.click(btn);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("DemoDevicePanels (UC-5, FR-5.1..5.2)", () => {
  it("AK-5.1: 6 bölüm sekmesi tanımlıdır", () => {
    expect(DEMO_DEVICE_TABS).toHaveLength(6);
    expect(DEMO_DEVICE_TABS.map((t) => t.id)).toEqual([
      "mv",
      "battery",
      "pcs",
      "hvac",
      "rmutr",
      "aux",
    ]);
  });

  it("AK-5.2: batarya bölümü raf SOC/V/I/sıcaklık hücrelerini gösterir", () => {
    const rack8 = (v: number) => Array.from({ length: 8 }, () => v);
    const u: NovaUnitState = {
      ...scadaUnit,
      banks: [
        { ...scadaUnit.banks[0], rackSoc: rack8(61), rackV: rack8(1298), rackI: rack8(120) },
        scadaUnit.banks[1],
      ],
    };
    render(<DemoBatteryPanel unit={u} topology={scadaTopo} />);
    expect(screen.getByText("DC BUS A · SOC 60,0 % · SOH 98,0 % · 1300 V")).toBeTruthy();
    expect(screen.getAllByText("R1")).toHaveLength(2);
    expect(screen.getAllByText("61,0")).toHaveLength(8);
    expect(screen.getAllByText("1298")).toHaveLength(8);
    expect(screen.getAllByText("120")).toHaveLength(8);
  });
});

describe("DemoFaultList / DemoFaultResolve (UC-6, FR-6.1..6.2)", () => {
  const activeFault: DemoFault = {
    deviceId: "BSC-1",
    alarmName: "OverTemp",
    severity: "error",
    active: true,
    resolved: false,
  };
  const resolvedFault: DemoFault = {
    deviceId: "PCS-1",
    alarmName: "CommLoss",
    severity: "warning",
    active: false,
    resolved: true,
    resolvedBy: "teknikci",
  };

  it("AK-6.1: aktif filtre yalnızca aktif alarmları gösterir", () => {
    render(
      <DemoFaultList
        alarms={[activeFault, resolvedFault]}
        filter="active"
        onFilterChange={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("OverTemp")).toBeTruthy();
    expect(screen.queryByText("CommLoss")).toBeNull();
  });

  it("çözülmüş filtre resolve butonu göstermez", () => {
    render(
      <DemoFaultList
        alarms={[activeFault, resolvedFault]}
        filter="resolved"
        onFilterChange={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("CommLoss")).toBeTruthy();
    expect(screen.queryAllByTestId(/^fault-resolve-/)).toHaveLength(0);
  });

  it("AK-6.2: notu onConfirm'e iletir", () => {
    const onConfirm = vi.fn();
    render(
      <DemoFaultResolve
        alarm={activeFault}
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId("fault-note"), {
      target: { value: "saha kontrol edildi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Çözüldü işaretle/ }));
    expect(onConfirm).toHaveBeenCalledWith("BSC-1", "OverTemp", "saha kontrol edildi");
  });
});

describe("DemoEventLog (UC-8, FR-8.1)", () => {
  it("severity filtresi yalnızca ilgili kayıtları gösterir", () => {
    render(
      <DemoEventLog
        events={[
          { id: "1", timestamp: "2026-10-07T10:00:00.000Z", type: "error", source: "system", message: "hata var" },
          { id: "2", timestamp: "2026-10-07T10:01:00.000Z", type: "info", source: "user", message: "bilgi var" },
        ]}
      />,
    );
    expect(screen.getAllByTestId("event-row")).toHaveLength(2);
    fireEvent.click(screen.getByTestId("event-filter-error"));
    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
    expect(screen.getByText("hata var")).toBeTruthy();
  });
});
