import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { HvacUnit } from "@gd-monorepo/ui";
import { createMockHvacData, createMockRectPosition } from "../../../__stories__/mocks/factories";
import { drawHvacChassis } from "./HvacUnit.drawers";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/HvacUnit",
  component: HvacUnit,
  tags: ["autodocs"],
};
export default meta;

const pos = createMockRectPosition(10, 10, 80, 140);
const config = { step: 50 };
const wrapper = { width: 120, height: 180, background: "#0f0f1a" } as const;

export const Base = () => (
  <div style={{ width: 90, height: 150 }}>
    <Application width={90} height={150} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics
        draw={(g) => {
          g.clear();
          drawHvacChassis(g, { x: 5, y: 5, width: 80, height: 140 }, config);
        }}
      />
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };


export const OnlineCooling = () => (
  <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "cooling")} pos={pos} config={config} />
    </Application>
  </div>
);

export const OnlineWarming = () => (
  <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "warming")} pos={pos} config={config} />
    </Application>
  </div>
);

export const Offline = () => (
  <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("offline", "idle")} pos={pos} config={config} />
    </Application>
  </div>
);

export const Idle = () => (
  <div style={wrapper}>
    <Application width={120} height={180} background={0x0f0f1a} antialias={false} resolution={1}>
      <HvacUnit hvac={createMockHvacData("online", "idle")} pos={pos} config={config} />
    </Application>
  </div>
);
