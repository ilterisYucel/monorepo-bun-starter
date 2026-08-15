import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { GridSymbol } from "./GridSymbol";
import { drawGridChassis } from "./GridSymbol.drawers";
import { SpriteTextureProvider } from "../../../core/SpriteTextureProvider";
import { SPRITE_ASSETS } from "../../textures";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/GridSymbol",
  component: GridSymbol,
  tags: ["autodocs"],
};
export default meta;

const config = { step: 40 };
const wrapper = { width: 120, height: 100, background: "#0f0f1a" } as const;

export const Base = () => (
  <div style={{ width: 84, height: 60 }}>
    <Application width={84} height={60} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics
        draw={(g) => {
          g.clear();
          drawGridChassis(g, 6, 6, 72, 48, config.step);
        }}
      />
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };

export const Normal = () => (
  <div style={wrapper}>
    <Application width={120} height={100} background={0x0f0f1a} antialias={false} resolution={1}>
      <GridSymbol x={24} y={26} width={72} height={48} config={config} />
    </Application>
  </div>
);

export const SpriteMode = () => (
  <div style={wrapper}>
    <Application width={120} height={100} background={0x0f0f1a} antialias={false} resolution={1}>
      <SpriteTextureProvider assets={SPRITE_ASSETS}>
        <GridSymbol x={24} y={26} width={72} height={48} config={config} />
      </SpriteTextureProvider>
    </Application>
  </div>
);
