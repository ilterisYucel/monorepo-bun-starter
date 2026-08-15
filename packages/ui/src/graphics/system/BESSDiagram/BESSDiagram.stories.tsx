import React from "react";
import { BESSDiagram } from "./BESSDiagram";
import type { BSCUnitWithSummary } from "./BESSDiagram.types";
import type { Rack } from "../../../types/rack";

const meta = { title: "Graphics/BESSDiagram", component: BESSDiagram, tags: ["autodocs"] };
export default meta;

const rack = (overrides: Partial<Rack>): Rack => ({
  id: 1,
  deviceId: "BESS-1",
  name: "Rack-1",
  status: "online",
  charge_status: "Charge",
  soc: 50,
  soh: 95,
  voltage: 48,
  current: 6,
  power_kw: 0.3,
  temperature: 28,
  ...overrides,
});

const bscUnit = (deviceId: string, idOffset: number, summary?: BSCUnitWithSummary["systemSummary"]): BSCUnitWithSummary => ({
  deviceId,
  racks: Array.from({ length: 8 }, (_, i) =>
    rack({
      id: idOffset + i,
      deviceId,
      name: `Rack-${idOffset + i}`,
      status: i === 7 ? "offline" : "online",
      charge_status: i % 3 === 0 ? "Discharge" : "Charge",
      soc: 90 - i * 9,
    }),
  ),
  breakerStatus: "online",
  breakerPosition: "close",
  dcOutput: { status: "online", voltage: 48, current: 12 },
  systemSummary: summary ?? {
    avgSoC: 62,
    avgSoH: 94,
    avgVoltage: 48.1,
    avgCurrent: 8.4,
    avgPower: 0.4,
    onlineRackCount: 7,
    totalRackCount: 8,
  },
});

const hvacRooms = Array.from({ length: 4 }, (_, i) => ({
  temp: 21 + i,
  humidity: 45 + i,
  setTemp: 22,
  hvacs: [
    { status: "online", mode: i % 2 === 0 ? "cooling" : "warming" },
    { status: "online", mode: "cooling" },
  ] as [unknown, unknown] as never,
}));

export const Default = () => (
  <div style={{ width: 1200, background: "#0f0f1a", borderRadius: 8 }}>
    <BESSDiagram
      bscUnits={[bscUnit("BSC-1", 1), bscUnit("BSC-2", 9)]}
      flowDirection="Charge"
      hvacRooms={hvacRooms as never}
      panelTemp={22}
      panelHumidity={48}
      energyAnalyzer={{ voltage: 391.2, current: 148.7, power: 58.2, energy: 12345.6 }}
      firePanel={{
        fault: false,
        fire: false,
        firstStageAlarm: false,
        secondStageAlarm: false,
        discharged: false,
        extract: false,
        modeAuto: true,
        hold: false,
        abort: false,
      }}
      width={1200}
      height={900}
    />
  </div>
);
