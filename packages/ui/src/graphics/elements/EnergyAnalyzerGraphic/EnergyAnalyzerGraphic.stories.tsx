import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { EnergyAnalyzerGraphic } from "./EnergyAnalyzerGraphic";
import { drawEABox } from "./EnergyAnalyzerGraphic.drawers";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/EnergyAnalyzerGraphic",
  component: EnergyAnalyzerGraphic,
  tags: ["autodocs"],
};
export default meta;

const wrapper = { width: 340, height: 420, background: "#0f0f1a" } as const;

export const Base = () => (
  <div style={{ width: 308, height: 214 }}>
    <Application width={308} height={214} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics
        draw={(g) => {
          g.clear();
          drawEABox(g, 4, 4, 300, 206, 20);
        }}
      />
      <pixiGraphics
        draw={(g) => {
          g.clear();
          // AI üretim referansı için KALIN iç içe 2 kutu — kutular dominant eleman,
          // AI'ın düşürmemesi için belirgin çizilir
          g.roundRect(4, 4, 300, 206, 1.6);
          g.stroke({ width: 16, color: 0x4a4a5a });
          g.roundRect(58, 60, 192, 88, 1);
          g.stroke({ width: 9, color: 0x4a4a5a });
        }}
      />
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };


export const Normal = () => (
  <div style={wrapper}>
    <Application width={340} height={420} background={0x0f0f1a} antialias={false} resolution={1}>
      <EnergyAnalyzerGraphic
        data={{ voltage: 391.2, current: 148.7, power: 58.2, energy: 12345.6 }}
        x={20} y={20}
        width={300} height={380}
        config={{ step: 20 }}
        label="EA-01"
      />
    </Application>
  </div>
);
