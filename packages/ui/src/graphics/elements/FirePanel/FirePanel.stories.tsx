import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { FirePanel } from "./FirePanel";
import { drawFirePanelChassis, drawFirePanelSockets } from "./FirePanel.drawers";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/FirePanel",
  component: FirePanel,
  tags: ["autodocs"],
};
export default meta;

const wrapper = { width: 420, height: 320, background: "#0f0f1a" } as const;

export const Base = () => (
  <div style={{ width: 388, height: 288 }}>
    <Application width={388} height={288} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics
        draw={(g) => {
          g.clear();
          drawFirePanelChassis(g, 4, 4, 380, 280, { step: 20 });
          drawFirePanelSockets(g, 4, 4, 380, 280, { step: 20 });
        }}
      />
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };


export const Normal = () => (
  <div style={wrapper}>
    <Application width={420} height={320} background={0x0f0f1a} antialias={false} resolution={1}>
      <FirePanel
        data={{
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
        x={20} y={20}
        width={380} height={280}
        config={{ step: 20 }}
      />
    </Application>
  </div>
);

export const FireAlarm = () => (
  <div style={wrapper}>
    <Application width={420} height={320} background={0x0f0f1a} antialias={false} resolution={1}>
      <FirePanel
        data={{
          fault: false,
          fire: true,
          firstStageAlarm: true,
          secondStageAlarm: true,
          discharged: true,
          extract: true,
          modeAuto: true,
          hold: false,
          abort: false,
        }}
        x={20} y={20}
        width={380} height={280}
        config={{ step: 20 }}
      />
    </Application>
  </div>
);
