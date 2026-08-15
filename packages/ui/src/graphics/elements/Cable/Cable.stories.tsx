import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { Cable } from "./Cable";
import { COLOR } from "../../../colors";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/Cable",
  component: Cable,
  tags: ["autodocs"],
};
export default meta;

const wrapper = { width: 600, height: 200, background: "#0f0f1a" } as const;
const path = [
  { x: 40, y: 100 },
  { x: 200, y: 100 },
  { x: 200, y: 60 },
  { x: 400, y: 60 },
  { x: 400, y: 140 },
  { x: 560, y: 140 },
];

// Sprite üretimi için nötr baz: ince düz yatay kablo segmenti (pabuçsuz), şeffaf zemin.
export const Base = () => (
  <div style={{ width: 212, height: 48 }}>
    <Application width={212} height={48} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.setStrokeStyle({ width: 3, color: COLOR.cable, cap: "round", join: "round" });
          g.moveTo(6, 24);
          g.lineTo(206, 24);
          g.stroke();
        }}
      />
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };


export const Idle = () => (
  <div style={wrapper}>
    <Application width={600} height={200} background={0x0f0f1a} antialias={false} resolution={1}>
      <Cable path={path} flowDirection="idle" step={20} />
    </Application>
  </div>
);

export const Charging = () => (
  <div style={wrapper}>
    <Application width={600} height={200} background={0x0f0f1a} antialias={false} resolution={1}>
      <Cable path={path} flowDirection="charge" step={20} />
    </Application>
  </div>
);

export const Discharging = () => (
  <div style={wrapper}>
    <Application width={600} height={200} background={0x0f0f1a} antialias={false} resolution={1}>
      <Cable path={path} flowDirection="discharge" step={20} />
    </Application>
  </div>
);
