import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { CircuitBreaker } from "@gd-monorepo/ui";
import { drawBreakerChassis } from "./CircuitBreaker.drawers";
import { SpriteTextureProvider } from "../../../core/SpriteTextureProvider";
import { SPRITE_ASSETS } from "../../textures";
import { COLOR } from "../../../colors";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/CircuitBreaker",
  component: CircuitBreaker,
  tags: ["autodocs"],
};
export default meta;

const config = { step: 30 };
const positions = {
  circuitBreaker: { endX: 120, gapSize: 12 },
  convergence: { x: 40 },
  topBusY: 30,
  bottomBusY: 90,
};
const wrapper = { width: 200, height: 160, background: "#0f0f1a" } as const;

// Nötr baz: sabit geometri (chassis 80x21 @ (12,12)) + ortada koyu ekran yuvası.
// AI ekranı sprite'a gömer; kod verileri ölçülen yuvaya yazar.
const basePositions = {
  circuitBreaker: { endX: 89, gapSize: 8 },
  convergence: { x: 9 },
  topBusY: 7.5,
  bottomBusY: 37.5,
};

export const Base = () => (
  <div style={{ width: 104, height: 45 }}>
    <Application width={104} height={45} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics draw={(g) => { g.clear(); drawBreakerChassis(g, config, basePositions); }} />
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.roundRect(32, 16.5, 40, 12, 2);
          g.fill({ color: COLOR.gradScreen, alpha: 0.9 });
          g.stroke({ width: 1, color: COLOR.borderStroke, alpha: 0.6 });
        }}
      />
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };


export const SpriteMode = () => (
  <div style={wrapper}>
    <Application width={200} height={160} background={0x0f0f1a} antialias={false} resolution={1}>
      <SpriteTextureProvider assets={SPRITE_ASSETS}>
        <CircuitBreaker
          config={config}
          positions={positions}
          breakerStatus="online"
          breakerPosition="close"
        />
      </SpriteTextureProvider>
    </Application>
  </div>
);


export const OnlineClosed = () => (
  <div style={wrapper}>
    <Application width={200} height={160} background={0x0f0f1a} antialias={false} resolution={1}>
      <CircuitBreaker
        config={config}
        positions={positions}
        breakerStatus="online"
        breakerPosition="close"
      />
    </Application>
  </div>
);

export const OnlineOpen = () => (
  <div style={wrapper}>
    <Application width={200} height={160} background={0x0f0f1a} antialias={false} resolution={1}>
      <CircuitBreaker
        config={config}
        positions={positions}
        breakerStatus="online"
        breakerPosition="open"
      />
    </Application>
  </div>
);

export const Offline = () => (
  <div style={wrapper}>
    <Application width={200} height={160} background={0x0f0f1a} antialias={false} resolution={1}>
      <CircuitBreaker
        config={config}
        positions={positions}
        breakerStatus="offline"
        breakerPosition="close"
      />
    </Application>
  </div>
);
