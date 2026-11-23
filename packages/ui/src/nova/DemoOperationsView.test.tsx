import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { OperationRunRecord } from "@gd-monorepo/shared-types";
import { DemoOperationsView, isStaleRun, parseRunSteps, runLabel, type DemoOpDef } from "./DemoOperationsView";
import type { NovaStationState, NovaTopology } from "./mimic-types";

const defs: DemoOpDef[] = [
  { key: "chgdis", id: "FL-02", title: "Charge / Discharge", summary: "s", icon: "bolt" },
  { key: "calib", id: "FL-04", title: "Calibration", summary: "s", icon: "calib" },
];

const run = (over: Partial<OperationRunRecord>): OperationRunRecord =>
  ({
    id: "r1",
    kind: "maneuver",
    name: "fl04_calibration",
    trigger: "manual",
    status: "completed",
    steps: { params: {}, definition: { label: "FL-04: Kalibrasyon", steps: [{ command: "standby", deviceTypes: ["pcs"] }] } },
    startedAt: "2026-10-08T09:23:01.178Z",
    finishedAt: "2026-10-08T09:23:02.000Z",
    createdBy: "admin",
    traceId: null,
    ...over,
  }) as OperationRunRecord;

const station: NovaStationState = {
  H01: "closed",
  H02: "closed",
  H04: "closed",
  H05: "closed",
  kV: 34.5,
  hz: 50,
  es: {},
  iA: {},
};

const topo = { limits: { tempMin: 19, tempMax: 25, socMin: 3.5, socMax: 97 }, unit: {}, station: { name: "BESS MV STATION #1", nominalKV: 34.5, cells: [] }, feeders: {} } as unknown as NovaTopology;

describe("parseRunSteps / runLabel (UC-5 — sequences veri modeli)", () => {
  it("steps.definition.steps dizisini okur ve run durumundan adım durumu türetir", () => {
    const steps = parseRunSteps(run({ status: "completed" }));
    expect(steps).toHaveLength(1);
    expect(steps[0].label).toBe("standby · pcs");
    expect(steps[0].state).toBe("done");
  });

  it("legacy dizi şeklini de destekler", () => {
    const steps = parseRunSteps(run({ steps: [{ label: "PCS start", status: "completed" }] as unknown as OperationRunRecord["steps"] }));
    expect(steps[0].label).toBe("PCS start");
  });

  it("run adını FL etiketine çevirir", () => {
    expect(runLabel("fl04_calibration", defs)).toBe("FL-04 · Calibration");
    expect(runLabel("charge", defs)).toBe("FL-02 · Charge / Discharge");
    expect(runLabel("unknown_op", defs)).toBe("unknown_op");
  });

  it("UC-13: 90 sn'den eski 'running' run bayat sayılır (zombie koruması)", () => {
    const now = Date.parse("2026-10-08T09:30:00.000Z");
    const running = (startedAt: string) => run({ status: "running", startedAt });
    expect(isStaleRun(running("2026-10-08T09:29:00.000Z"), now)).toBe(false); // 60 sn
    expect(isStaleRun(running("2026-10-08T09:28:00.000Z"), now)).toBe(true); // 120 sn
    expect(isStaleRun(run({ status: "completed" }), now)).toBe(false);
  });
});

describe("DemoOperationsView render (UC-5)", () => {
  const base = {
    defs,
    units: [{ n: 1, soc: 50, available: true, note: "" }],
    runs: [run({})],
    station,
    topology: topo,
    permissivesFor: () => [],
  };

  it("sekansı FL etiketi + DONE + adım satırıyla gösterir", () => {
    render(<DemoOperationsView {...base} />);
    // hem manevra listesinde hem sequenz başlığında görünür
    expect(screen.getAllByText("FL-04 · Calibration").length).toBeGreaterThan(1);
    expect(screen.getAllByText("DONE").length).toBeGreaterThan(0);
    expect(screen.getByText("standby · pcs")).toBeTruthy();
  });

  it("FL-02 formunda Direction + reactive güç kontrolleri vardır", () => {
    render(<DemoOperationsView {...base} />);
    expect(screen.getByText("Direction")).toBeTruthy();
    expect(screen.getByText(/Reactive power/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Q = 0" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Constant Q" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Constant PF" })).toBeTruthy();
    expect(screen.getByText(/Stop when/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Target SOC" })).toBeTruthy();
  });

  it("MV Station başlığı aktif istasyon adını gösterir (station değişiminde değişir)", () => {
    const { rerender } = render(<DemoOperationsView {...base} />);
    expect(
      screen.getByRole("heading", { name: /BESS MV STATION #1/ }),
    ).toBeTruthy();

    rerender(
      <DemoOperationsView
        {...base}
        topology={
          {
            ...topo,
            station: { ...topo.station, name: "BESS MV STATION #2" },
          } as unknown as NovaTopology
        }
      />,
    );
    expect(
      screen.getByRole("heading", { name: /BESS MV STATION #2/ }),
    ).toBeTruthy();
  });

  it("units mount'tan sonra gelirse varsayılan kapsam senkronlanır (Send etkin)", () => {
    const { rerender } = render(<DemoOperationsView {...base} units={[]} />);
    expect((screen.getByTestId("ops-send") as HTMLButtonElement).disabled).toBe(true);
    rerender(
      <DemoOperationsView
        {...base}
        units={[{ n: 1, soc: 50, available: true, note: "" }]}
      />,
    );
    expect((screen.getByTestId("ops-send") as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getAllByText(/BESS#1/).length).toBeGreaterThan(0);
  });
});

describe("FL-02 — fider seçimi + beklenen sonuç (Tur-1 ön yüz)", () => {
  const topoWithFeeders = {
    ...topo,
    unit: { containerMWh: 3.5 },
    feeders: {
      A: { cell: "H04", side: "L", units: [1, 2] },
      B: { cell: "H05", side: "R", units: [3] },
    },
  } as unknown as NovaTopology;

  const base = {
    defs,
    units: [
      { n: 1, soc: 50, available: true, note: "" },
      { n: 2, soc: 50, available: true, note: "" },
      { n: 3, soc: 40, available: true, note: "" },
    ],
    runs: [],
    station,
    topology: topoWithFeeders,
    permissivesFor: () => [],
  };

  it("fider satırlarını hücre adıyla gösterir ve tüm fideri tek tıkla seçer", () => {
    render(<DemoOperationsView {...base} />);
    const feeder = screen.getByTestId("ops-feeder-site-H04");
    expect(feeder.textContent).toContain("H04");
    // Başlangıçta tümü seçili → fider butonu "true"; tıklayınca fider temizlenir.
    const toggleBtn = feeder.querySelector("button.br-tog") as HTMLButtonElement;
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggleBtn);
    const after = screen.getByTestId("ops-feeder-site-H04").querySelector("button.br-tog") as HTMLButtonElement;
    expect(after.getAttribute("aria-pressed")).toBe("false");
  });

  it("beklenen sonuç paneli ve dal tablosu çizilir", () => {
    render(<DemoOperationsView {...base} />);
    expect(screen.getByTestId("ops-expect")).toBeTruthy();
    expect(screen.getByTestId("ops-branch-table")).toBeTruthy();
    expect(screen.getByText(/Expected result/)).toBeTruthy();
    // 2 fider + toplam satırı
    expect(screen.getAllByText(/Feeder A|Feeder B/).length).toBeGreaterThan(0);
  });

  it("çalışan program varsa 'replace' uyarısı gösterir", () => {
    render(
      <DemoOperationsView
        {...base}
        runs={[
          run({
            id: "run-live",
            name: "charge",
            status: "running",
            startedAt: new Date().toISOString(),
            finishedAt: null,
            steps: { params: { scope: [1, 9] }, definition: { steps: [{ command: "charge" }] } },
          } as Partial<OperationRunRecord>),
        ]}
      />,
    );
    expect(screen.getByTestId("ops-running-warn")).toBeTruthy();
    expect(screen.getByTestId("ops-running-warn").textContent).toContain("BESS#9");
  });
});

describe("parseRunSteps — adım açıklaması", () => {
  it("config'teki description alanını adıma taşır", () => {
    const steps = parseRunSteps(
      run({
        steps: {
          definition: {
            steps: [{ command: "start", label: "PCS'i başlat", description: "PCS start komutu (S16)." }],
          },
        },
      }),
    );
    expect(steps[0]?.label).toBe("PCS'i başlat");
    expect(steps[0]?.detail).toBe("PCS start komutu (S16).");
  });
});

describe("FL-02 — N istasyonlu görünüm", () => {
  const twoStations = [
    {
      key: "bess1",
      name: "BESS MV STATION #1",
      feeders: { A: { cell: "H04", units: [1] }, B: { cell: "H05", units: [2] } },
      units: [
        { n: 1, soc: 50, available: true, note: "" },
        { n: 2, soc: 45, available: true, note: "" },
      ],
      permissives: [{ ok: true, hard: false, label: "Station 1 ready", detail: "ok" }],
    },
    {
      key: "bess2",
      name: "BESS MV STATION #2",
      feeders: { A: { cell: "H06", units: [3] }, B: { cell: "H07", units: [4] } },
      units: [
        { n: 3, soc: 40, available: true, note: "" },
        { n: 4, soc: 35, available: true, note: "" },
      ],
      permissives: [{ ok: true, hard: false, label: "Station 2 ready", detail: "ok" }],
    },
  ];

  it("istasyon başlıkları ve fider satırları istasyon başına çizilir", () => {
    render(
      <DemoOperationsView
        defs={defs}
        units={twoStations[0]!.units}
        stations={twoStations}
        runs={[]}
        station={station}
        topology={topo}
        permissivesFor={() => []}
      />,
    );
    expect(screen.getByTestId("ops-station-bess1")).toBeTruthy();
    expect(screen.getByTestId("ops-station-bess2")).toBeTruthy();
    expect(screen.getByTestId("ops-feeder-bess1-H04")).toBeTruthy();
    expect(screen.getByTestId("ops-feeder-bess2-H06")).toBeTruthy();
    // İstasyon bazlı permissives
    expect(screen.getByText("Station 1 ready")).toBeTruthy();
    expect(screen.getByText("Station 2 ready")).toBeTruthy();
  });
});

describe("FL-02 — kapsam seçimi kullanıcıya ait", () => {
  const topoWithFeeders = {
    ...topo,
    unit: { containerMWh: 3.5 },
    feeders: {
      A: { cell: "H04", side: "L", units: [1] },
      B: { cell: "H05", side: "R", units: [2] },
    },
  } as unknown as NovaTopology;

  const unit = (n: number) => ({ n, soc: 50, available: true, note: "" });
  const chips = () =>
    screen.getAllByRole("button").filter((b) => (b.className ?? "").includes("chipb"));

  it("Clear sonrası telemetri (units) güncellense de seçim geri dolmaz", () => {
    const { rerender } = render(
      <DemoOperationsView
        defs={defs}
        units={[unit(1), unit(2)]}
        runs={[]}
        station={station}
        topology={topoWithFeeders}
        permissivesFor={() => []}
      />,
    );
    // Başlangıçta otomatik dolu
    expect(chips().some((c) => c.getAttribute("aria-pressed") === "true")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(chips().every((c) => c.getAttribute("aria-pressed") === "false")).toBe(true);
    expect((screen.getByTestId("ops-send") as HTMLButtonElement).disabled).toBe(true);

    // Yeni units referansı (telemetri güncellemesi taklidi) → scope boş KALMALI
    rerender(
      <DemoOperationsView
        defs={defs}
        units={[unit(1), unit(2)]}
        runs={[]}
        station={station}
        topology={topoWithFeeders}
        permissivesFor={() => []}
      />,
    );
    expect(chips().every((c) => c.getAttribute("aria-pressed") === "false")).toBe(true);
    expect((screen.getByTestId("ops-send") as HTMLButtonElement).disabled).toBe(true);
  });
});
