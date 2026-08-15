import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { CableBus } from "./CableBus";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/CableBus",
  component: CableBus,
  tags: ["autodocs"],
};
export default meta;

const wrapper = { width: 600, height: 260, background: "#0f0f1a" } as const;

const positions = {
  racks: [
    { id: 1, x: 140, y: 100 },
    { id: 2, x: 300, y: 100 },
  ],
  topBusY: 70,
  bottomBusY: 200,
  convergenceX: 500,
  cbLeftMid: { x: 430, y: 135 },
};

export const Idle = () => (
  <div style={wrapper}>
    <Application width={600} height={260} background={0x0f0f1a} antialias={false} resolution={1}>
      <CableBus
        config={{ rackWidth: 120, rackHeight: 120, step: 20 }}
        positions={positions}
        flowDirection="idle"
      />
    </Application>
  </div>
);

export const Charging = () => (
  <div style={wrapper}>
    <Application width={600} height={260} background={0x0f0f1a} antialias={false} resolution={1}>
      <CableBus
        config={{ rackWidth: 120, rackHeight: 120, step: 20 }}
        positions={positions}
        flowDirection="charge"
      />
    </Application>
  </div>
);

export const Discharging = () => (
  <div style={wrapper}>
    <Application width={600} height={260} background={0x0f0f1a} antialias={false} resolution={1}>
      <CableBus
        config={{ rackWidth: 120, rackHeight: 120, step: 20 }}
        positions={positions}
        flowDirection="discharge"
      />
    </Application>
  </div>
);
