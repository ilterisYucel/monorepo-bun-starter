import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { PanelCard } from "@gd-monorepo/ui";
import { createMockRectPosition } from "../../../__stories__/mocks/factories";
import { drawPanelBody } from "./PanelCard.drawers";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/PanelCard",
  component: PanelCard,
  tags: ["autodocs"],
};
export default meta;

const pos = createMockRectPosition(10, 10, 60, 100);
const config = { step: 50 };
const wrapper = { width: 100, height: 140, background: "#0f0f1a" } as const;

export const Base = () => (
  <div style={{ width: 72, height: 112 }}>
    <Application width={72} height={112} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics
        draw={(g) => {
          g.clear();
          const baseStep = { step: 15 };
          const basePos = { x: 6, y: 6, width: 60, height: 100 };
          // Frame-only: AI yalnızca dış çerçeveyi üretsin — termometre kod tarafında
          drawPanelBody(g, basePos, baseStep);
        }}
      />
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };


export const Cold = () => (
  <div style={wrapper}>
    <Application width={100} height={140} background={0x0f0f1a} antialias={false} resolution={1}>
      <PanelCard pos={pos} panelTemp={5} config={config} />
    </Application>
  </div>
);

export const Normal = () => (
  <div style={wrapper}>
    <Application width={100} height={140} background={0x0f0f1a} antialias={false} resolution={1}>
      <PanelCard pos={pos} panelTemp={22} config={config} />
    </Application>
  </div>
);

export const Hot = () => (
  <div style={wrapper}>
    <Application width={100} height={140} background={0x0f0f1a} antialias={false} resolution={1}>
      <PanelCard pos={pos} panelTemp={40} config={config} />
    </Application>
  </div>
);
