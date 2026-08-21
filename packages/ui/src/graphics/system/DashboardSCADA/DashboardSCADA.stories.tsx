import type { Meta, StoryObj } from "@storybook/react";
import { DashboardSCADA } from "./DashboardSCADA";
import type { BSCUnit } from "../../deprecated/BSCGraphic/BSCGraphic.types";
import type { RoomData } from "../../deprecated/TMSGraphic/TMSGraphic.types";
import { createMockBSCUnit } from "../../../__stories__/mocks/factories";

const meta: Meta<typeof DashboardSCADA> = {
  title: "Graphics/DashboardSCADA",
  component: DashboardSCADA,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DashboardSCADA>;

const bscUnit: BSCUnit = createMockBSCUnit({
  deviceId: "BSC-1",
  racks: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    deviceId: "BSC-1",
    name: `Rack-${i + 1}`,
    status: i === 3 ? "offline" : "online",
    charge_status: "Charge",
    soc: i === 3 ? 0 : 40 + i * 6,
    voltage: 48,
    current: 6,
    power_kw: 0.3,
    temperature: 28,
  })),
});

const rooms: RoomData[] = [
  { temp: 24.1, hvacs: [{ status: "online", mode: "cooling" }, { status: "online", mode: "cooling" }] },
  { temp: 27.8, hvacs: [{ status: "online", mode: "cooling" }] },
];

export const Default: Story = {
  args: {
    bscUnits: [bscUnit],
    flowDirection: "Charge",
    hvacRooms: rooms,
    panelTemp: 26.5,
    panelHumidity: 48,
    energyFrequency: 50.02,
    energyTotalPower: 356,
    energyDelivered: 1240.5,
    fireAlarmActive: false,
    fireFaultActive: false,
    width: 1200,
  },
};

export const FireAlarm: Story = {
  args: {
    bscUnits: [bscUnit],
    flowDirection: "Idle",
    hvacRooms: rooms,
    panelTemp: 31.2,
    energyFrequency: 50.02,
    energyTotalPower: 0,
    fireAlarmActive: true,
    fireFaultActive: false,
    width: 1200,
  },
};
