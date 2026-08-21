import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { BSCUnitRow } from "./BSCUnitRow";
import type { BSCUnitRowPositions } from "./BSCUnitRow";
import { createMockBSCUnit } from "../../../__stories__/mocks/factories";

extend({ Container, Graphics, Text, Sprite });

const meta: Meta<typeof BSCUnitRow> = {
  title: "Graphics/BSCUnitRow",
  component: BSCUnitRow,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof BSCUnitRow>;

const positions: BSCUnitRowPositions = {
  rackXs: [40, 92, 144, 196, 248, 300, 352, 404],
  rackY: 60,
  rackWidth: 40,
  rackHeight: 140,
  topBusY: 30,
  bottomBusY: 240,
  convergenceX: 470,
  cbStartX: 480,
  cbEndX: 530,
  dcX: 560,
  dcRadius: 20,
  centerY: 135,
  step: 52,
};

const unit = createMockBSCUnit({
  deviceId: "BSC-1",
  racks: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    deviceId: "BSC-1",
    name: `Rack-${i + 1}`,
    status: "online",
    charge_status: "Charge",
    soc: 50 + i * 5,
    voltage: 48,
    current: 6,
    power_kw: 0.3,
    temperature: 28,
  })),
});

export const ChargingRow: Story = {
  render: () => (
    <div style={{ width: 640, height: 300, background: "#0f0f1a", borderRadius: 8 }}>
      <Application width={640} height={300} background={0x0f0f1a} antialias={false} resolution={1}>
        <BSCUnitRow unit={unit} positions={positions} flowDirection="Charge" busEndX={610} />
      </Application>
    </div>
  ),
};

export const DischargingRow: Story = {
  render: () => (
    <div style={{ width: 640, height: 300, background: "#0f0f1a", borderRadius: 8 }}>
      <Application width={640} height={300} background={0x0f0f1a} antialias={false} resolution={1}>
        <BSCUnitRow unit={unit} positions={positions} flowDirection="Discharge" busEndX={610} />
      </Application>
    </div>
  ),
};
