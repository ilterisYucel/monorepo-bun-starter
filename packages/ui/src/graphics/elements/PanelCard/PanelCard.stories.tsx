import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { PanelCard } from "@gd-monorepo/ui";
import { createMockRectPosition } from "../../../__stories__/mocks/factories";

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
