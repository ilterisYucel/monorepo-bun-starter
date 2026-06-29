import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { RackCell } from "@gd-monorepo/ui";
import { createMockRack, createMockRackCellConfig } from "../../../__stories__/mocks/factories";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/RackCell",
  component: RackCell,
  tags: ["autodocs"],
};
export default meta;

const config = createMockRackCellConfig(100);
const wrapper = { width: 160, height: 420, background: "#0f0f1a" } as const;

export const OnlineCharging = () => (
  <div style={wrapper}>
    <Application width={160} height={420} background={0x0f0f1a} antialias={false} resolution={1}>
      <RackCell
        rack={createMockRack("online", "Charge", { soc: 75, voltage: 48.2, current: 12.5 })}
        x={20} y={20}
        config={config}
        flowDirection="Charge"
      />
    </Application>
  </div>
);

export const OnlineDischarging = () => (
  <div style={wrapper}>
    <Application width={160} height={420} background={0x0f0f1a} antialias={false} resolution={1}>
      <RackCell
        rack={createMockRack("online", "Discharge", { soc: 30, voltage: 46.1 })}
        x={20} y={20}
        config={config}
        flowDirection="Discharge"
      />
    </Application>
  </div>
);

export const Offline = () => (
  <div style={wrapper}>
    <Application width={160} height={420} background={0x0f0f1a} antialias={false} resolution={1}>
      <RackCell
        rack={createMockRack("offline", "Idle", { soc: null })}
        x={20} y={20}
        config={config}
        flowDirection="Idle"
      />
    </Application>
  </div>
);

export const Idle = () => (
  <div style={wrapper}>
    <Application width={160} height={420} background={0x0f0f1a} antialias={false} resolution={1}>
      <RackCell
        rack={createMockRack("online", "Idle", { soc: 72 })}
        x={20} y={20}
        config={config}
        flowDirection="Idle"
      />
    </Application>
  </div>
);

export const Full = () => (
  <div style={wrapper}>
    <Application width={160} height={420} background={0x0f0f1a} antialias={false} resolution={1}>
      <RackCell
        rack={createMockRack("online", "Charge", { soc: 100 })}
        x={20} y={20}
        config={config}
        flowDirection="Charge"
      />
    </Application>
  </div>
);
