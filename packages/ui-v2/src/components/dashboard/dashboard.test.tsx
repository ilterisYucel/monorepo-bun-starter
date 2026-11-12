import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../theme";
import { ContainerPlan } from "./ContainerPlan";
import { DcSections } from "./DcSections";
import { ElectricalSingleLine } from "./ElectricalSingleLine";
import { EventsLog, StringStates } from "./EventsPanel";
import { KpiRow } from "./KpiRow";
import { Sidebar } from "./Sidebar";
import { TabRow } from "./TabRow";
import { TopBar } from "./TopBar";

const wrap = (node: React.ReactNode) => render(<ThemeProvider mode="light">{node}</ThemeProvider>);

describe("Sidebar", () => {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" as const },
    { key: "racks", label: "Rack Details", icon: "rackDetails" as const },
  ];

  it("nav öğelerini çizer ve aktif olanı işaretler", () => {
    wrap(<Sidebar items={items} active="dashboard" />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dashboard/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Rack Details/ })).not.toHaveAttribute("aria-current");
  });

  it("seçim callback'i tetikler", () => {
    const onSelect = vi.fn();
    wrap(<Sidebar items={items} active="dashboard" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Rack Details/ }));
    expect(onSelect).toHaveBeenCalledWith("racks");
  });

  it("sürüm ve footer gösterir", () => {
    wrap(<Sidebar items={items} active="dashboard" version="v.101" />);
    expect(screen.getByText("v.101")).toBeInTheDocument();
    expect(screen.getByText("Powered by LG Energy Solution")).toBeInTheDocument();
  });
});

describe("TopBar", () => {
  const tabs = [
    { key: "site", label: "Site layout" },
    { key: "devices", label: "Devices" },
  ];

  it("sekmeleri ve canlı/saat bilgisini gösterir", () => {
    wrap(<TopBar tabs={tabs} active="devices" onSelect={() => undefined} />);
    expect(screen.getByRole("tab", { name: "Devices" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Live · updated/)).toBeInTheDocument();
    expect(screen.getByText(/23\.10\.2026/)).toBeInTheDocument();
  });

  it("acil durdurma callback'i tetikler", () => {
    const onStop = vi.fn();
    wrap(<TopBar tabs={tabs} active="site" onSelect={() => undefined} onEmergencyStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: /Emergency stop/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});

describe("TabRow", () => {
  it("başlık, alt başlık ve pill'leri gösterir", () => {
    wrap(
      <TabRow
        title="GD-1 · MV Station #1"
        subtitle="GDE-202030 · Polatlı, Ankara"
        pills={[
          { tone: "info", label: "Discharging · 14,8 MW" },
          { tone: "success", label: "Ready" },
        ]}
      />,
    );
    expect(screen.getByText("GD-1 · MV Station #1")).toBeInTheDocument();
    expect(screen.getByText("Discharging · 14,8 MW")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});

describe("KpiRow", () => {
  it("altı KPI kartını, bar/kv/track/band içerikleriyle render eder", () => {
    wrap(
      <KpiRow
        items={[
          { key: "a", label: "Active power · AC", value: "+2,15", unit: "MW", tone: "warning", bars: [{ label: "A", pct: 62 }, { label: "B", pct: 62 }] },
          { key: "b", label: "Reactive · apparent", value: "0,20", unit: "Mvar", kv: [{ label: "Apparent", value: "2,16 MVA" }, { label: "Power factor", value: "0,996" }] },
          { key: "c", label: "SOC per BSC", value: "53,2", unit: "%", tone: "info", valueSize: "compact", bars: [{ label: "A", pct: 53 }, { label: "B", pct: 53 }] },
          { key: "d", label: "Energy available", value: "3,80", unit: "MWh", track: { pct: 53, tone: "success" }, caption: "of 7,14 MWh nameplate" },
          { key: "e", label: "Power limits", value: "3,45", unit: "MW", kv: [{ label: "Charge", value: "3,45 MW" }, { label: "Discharge", value: "3,45 MW" }] },
          { key: "f", label: "Cell temperature", value: "22,7", unit: "°C max", band: { start: 26.6, width: 40, markers: [{ pct: 38, tone: "info" }, { pct: 48.8, tone: "critical" }] }, caption: "min 20,9 · ΔT 1,8 °C" },
        ]}
      />,
    );
    expect(screen.getByText("Active power · AC")).toBeInTheDocument();
    expect(screen.getByText("SOC per BSC")).toBeInTheDocument();
    expect(screen.getAllByText("A")).toHaveLength(2);
    expect(screen.getByText("Apparent")).toBeInTheDocument();
    expect(screen.getByText("2,16 MVA")).toBeInTheDocument();
    expect(screen.getByText("0,996")).toBeInTheDocument();
    expect(screen.getByText("of 7,14 MWh nameplate")).toBeInTheDocument();
    expect(screen.getAllByText("3,45 MW")).toHaveLength(2);
    expect(screen.getByText("min 20,9 · ΔT 1,8 °C")).toBeInTheDocument();
  });
});

describe("ContainerPlan", () => {
  it("oda kartlarını, chip'leri ve over-temp rozetini gösterir", () => {
    wrap(
      <ContainerPlan
        panel={{ temperature: 24, subtitle: "Control panel · FSS", scalePct: 50, footerLeft: "FSS normal", footerRight: "38 %rh" }}
        rooms={[
          {
            key: "r1",
            label: "Room 1",
            range: "R1–R4",
            temperature: 21.4,
            dots: ["success", "success", "warning", "success"],
            scalePct: 43,
            supply: 18.5,
            ret: 26.2,
            humidity: 41,
            chips: [{ label: "H1", pct: 64 }, { label: "H2", pct: 64 }],
          },
          {
            key: "r3",
            label: "Room 3",
            range: "R9–R12",
            temperature: 27.1,
            overTemp: true,
            dots: ["success", "success", "success", "success"],
            scalePct: 66,
            supply: 18.5,
            ret: 28.9,
            humidity: 44,
            chips: [{ label: "H5", pct: 64 }],
          },
        ]}
      />,
    );
    expect(screen.getByText("Room 1")).toBeInTheDocument();
    expect(screen.getByText("OVER TEMP")).toBeInTheDocument();
    expect(screen.getByText("H1 · 64 %")).toBeInTheDocument();
    expect(screen.getByText("41 %rh")).toBeInTheDocument();
  });
});

describe("DcSections", () => {
  it("satırları ve rozetleri render eder", () => {
    wrap(
      <DcSections
        sections={[
          {
            key: "bsc1",
            title: "BSC#1",
            subtitle: "8 racks · 8 online",
            badge: { tone: "critical", label: "ALARM" },
            rows: [{ label: "BSC state", value: "Alarm · Rack#9 fault", tone: "critical" }],
            footer: "Values straight from each device",
          },
        ]}
      />,
    );
    expect(screen.getByText("BSC#1")).toBeInTheDocument();
    expect(screen.getByText("ALARM")).toBeInTheDocument();
    expect(screen.getByText("Alarm · Rack#9 fault")).toBeInTheDocument();
  });
});

describe("EventsLog", () => {
  const events = [
    { id: "1", time: "14:31:52", severity: "warning" as const, source: "Room 3", message: "Air temperature high", status: "Active" },
    { id: "2", time: "14:28:06", severity: "critical" as const, source: "Rack#8", message: "Rack fault", status: "Active" },
    { id: "3", time: "14:27:58", severity: "info" as const, source: "BSC#1", message: "Racks online changed", status: "—" },
  ];

  it("varsayılan olarak tüm olayları gösterir", () => {
    wrap(<EventsLog events={events} />);
    expect(screen.getByText("Air temperature high")).toBeInTheDocument();
    expect(screen.getByText("Rack fault")).toBeInTheDocument();
  });

  it("Warnings sekmesi yalnız warning olaylarını gösterir", () => {
    wrap(<EventsLog events={events} />);
    fireEvent.click(screen.getByRole("tab", { name: /Warnings/ }));
    expect(screen.getByText("Air temperature high")).toBeInTheDocument();
    expect(screen.queryByText("Rack fault")).not.toBeInTheDocument();
  });

  it("arama mesajları filtreler ve export tetikler", () => {
    const onExport = vi.fn();
    wrap(<EventsLog events={events} onExport={onExport} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search events" }), {
      target: { value: "Rack fault" },
    });
    expect(screen.getByText("Rack fault")).toBeInTheDocument();
    expect(screen.queryByText("Air temperature high")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Export report/ }));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("eşleşme yoksa boş durum gösterir", () => {
    wrap(<EventsLog events={events} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Search events" }), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("Kriterlere uyan olay yok.")).toBeInTheDocument();
  });
});

describe("StringStates", () => {
  it("kartları ve satır değerlerini gösterir", () => {
    wrap(
      <StringStates
        cards={[
          {
            key: "bsc1",
            title: "BSC#1 state",
            badge: { tone: "critical", label: "ALARM" },
            rows: [{ key: "racks", label: "Racks online", value: "6 / 8", tone: "critical" }],
          },
        ]}
      />,
    );
    expect(screen.getByText("BSC#1 state")).toBeInTheDocument();
    expect(screen.getByText("6 / 8")).toBeInTheDocument();
  });
});

describe("ElectricalSingleLine", () => {
  const rack = (id: string, tone?: "alarm" | "offline") => ({
    id,
    soc: 71.1,
    temperature: 23.4,
    voltage: 1324,
    current: 107,
    tone,
  });

  const renderLine = () =>
    wrap(
      <ElectricalSingleLine
        bscs={[
          { id: "BSC#1", dcBusLabel: "DC BUS#1 +/- · 2000 A", racks: [rack("Rack#1"), rack("Rack#2"), rack("Rack#3", "alarm"), rack("Rack#4", "offline")] },
          { id: "BSC#2", dcBusLabel: "DC BUS#2 +/- · 2000 A", racks: [rack("Rack#9")] },
        ]}
        cbms={[
          { id: "DC CBM#1", state: "CLOSED", voltage: 1328, current: 1092, imd: "2,84 MΩ" },
          { id: "DC CBM#2", state: "CLOSED", voltage: 1324, current: 664, imd: "3,12 MΩ" },
        ]}
        pcs={[
          { id: "PCS 1A", state: "DISCHARGING", power: "1,42 MW", tone: "success" },
          { id: "PCS 1B", state: "LIMITED 50 %", power: "0,86 MW", tone: "warning" },
        ]}
        rmu={{ title: "RMU", state: "CLOSED", lines: ["H01 LBS in", "ES open"], values: [{ label: "34,5", value: "kV" }] }}
        trafo={{ title: "TR 3 750kVA", voltage: "34,5/0,69kV", vector: "Dy11y11" }}
      />,
    );

  it("BSC rack sıralarını, CBM/PCS ve RMU'yu render eder", () => {
    renderLine();
    expect(screen.getByText("BSC#1")).toBeInTheDocument();
    expect(screen.getByText("Rack#1")).toBeInTheDocument();
    expect(screen.getByText("DC CBM#1")).toBeInTheDocument();
    // 2 CBM (kutu + hat) × 2 + RMU durumu
    expect(screen.getAllByText("CLOSED")).toHaveLength(5);
    expect(screen.getByText("PCS 1A")).toBeInTheDocument();
    expect(screen.getByText("RMU · 34,5 kV")).toBeInTheDocument();
    expect(screen.getByText(/H01 LBS in/)).toBeInTheDocument();
  });

  it("rack kartında SOC %, sıcaklık, gerilim ve akım gösterir", () => {
    renderLine();
    expect(screen.getAllByText("71,1 %").length).toBeGreaterThan(0);
    expect(screen.getAllByText("23,4 °C").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1324 V").length).toBeGreaterThan(0);
    expect(screen.getAllByText("107 A").length).toBeGreaterThan(0);
  });

  it("CBM kutularında IMD chipleri gösterir", () => {
    renderLine();
    expect(screen.getByText("IMD 2,84 MΩ")).toBeInTheDocument();
    expect(screen.getByText("IMD 3,12 MΩ")).toBeInTheDocument();
  });

  it("CBM kutusu içinde başlık, durum ve V·A verisi gösterir", () => {
    renderLine();
    expect(screen.getByText("DC CBM#1")).toBeInTheDocument();
    expect(screen.getByText("1328 V·1092 A")).toBeInTheDocument();
    expect(screen.getByText("1324 V·664 A")).toBeInTheDocument();
  });

  it("her rack için drop hattı + DC CB kutusu çizer", () => {
    renderLine();
    expect(screen.getAllByTestId("dc-cb")).toHaveLength(5);
    expect(screen.getAllByTestId("drop-line")).toHaveLength(5);
  });

  it("offline rack'te kesikli drop/CB işaretler", () => {
    renderLine();
    const offlineCbs = screen.getAllByTestId("dc-cb").filter((el) => el.dataset.offline === "true");
    expect(offlineCbs).toHaveLength(1);
    expect(screen.getAllByTestId("drop-line").filter((el) => el.dataset.offline === "true")).toHaveLength(1);
  });

  it("PCS dairesi, yeşil CB ve AC BRK/CT çift dairesini çizer", () => {
    renderLine();
    expect(screen.getAllByTestId("pcs-circle")).toHaveLength(2);
    expect(screen.getAllByTestId("green-cb")).toHaveLength(2);
    expect(screen.getAllByTestId("ac-circle")).toHaveLength(2);
    // Üst ve alt yolun her birinde AC BRK + CT etiketi
    expect(screen.getAllByText("AC BRK")).toHaveLength(2);
    expect(screen.getAllByText("CT")).toHaveLength(2);
  });

  it("kavşak ortasında trafo verilerini gösterir", () => {
    renderLine();
    expect(screen.getByText("TR 3 750kVA")).toBeInTheDocument();
    expect(screen.getByText("34,5/0,69kV")).toBeInTheDocument();
    expect(screen.getByText("Dy11y11")).toBeInTheDocument();
  });

  it("discharge path (turuncu 3 px) uygulanır", () => {
    renderLine();
    const css = Array.from(document.querySelectorAll("style")).map((el) => el.textContent ?? "").join("\n");
    expect(css).toContain("#F57818");
    expect(css).toContain("height:3px");
  });
});
