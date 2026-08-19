import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { CircuitBreaker } from "@gd-monorepo/ui";
import { drawBreakerChassis } from "./CircuitBreaker.drawers";
import { SpriteTextureProvider } from "../../../core/SpriteTextureProvider";
import { SPRITE_ASSETS } from "../../textures";

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

// Nötr baz (varyantlı): kesici şema sembolü — sol/sağ terminal noktaları +
// İÇ İÇE 2 KARE outline + nötr bıçak (kapalı/açık konumda). AI kutuları ve
// bıçağı sprite'a gömer; durum metinleri kodda kalır.
// Sembol kutusu (logical): 60x70 — sprites-spec frame ile birebir.
const basePositions = {
  circuitBreaker: { endX: 80, gapSize: 8 },
  convergence: { x: 0 },
  topBusY: 0,
  bottomBusY: 70,
};

// Kalın capture katmanı: iç içe 2 kare (AI kutuları düşürmesin diye belirgin)
const drawThickSquares = (g: import("pixi.js").Graphics) => {
  g.clear();
  g.rect(20, 0, 60, 70);
  g.stroke({ width: 10, color: 0x4a4a5a });
  g.rect(33.2, 15.4, 33.6, 39.2);
  g.stroke({ width: 6, color: 0x4a4a5a });
};

const drawNeutralBlade = (g: import("pixi.js").Graphics, position: "close" | "open") => {
  g.setStrokeStyle({ width: 6, color: 0x4a4a5a, cap: "round" });
  if (position === "close") {
    g.moveTo(24, 35);
    g.lineTo(40, 35);
    g.stroke();
    g.moveTo(40, 31);
    g.lineTo(50, 39);
    g.stroke();
    g.moveTo(50, 35);
    g.lineTo(66, 35);
    g.stroke();
  } else {
    g.moveTo(24, 35);
    g.lineTo(40, 35);
    g.stroke();
    g.moveTo(45, 27);
    g.lineTo(45, 43);
    g.stroke();
    g.moveTo(50, 35);
    g.lineTo(66, 35);
    g.stroke();
  }
};

export const BaseClose = () => (
  <div style={{ width: 120, height: 110 }}>
    <Application width={120} height={110} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiContainer x={20} y={20}>
        <pixiGraphics draw={(g) => { g.clear(); drawBreakerChassis(g, { step: 100 }, basePositions); }} />
        <pixiGraphics draw={drawThickSquares} />
        <pixiGraphics draw={(g) => drawNeutralBlade(g, "close")} />
      </pixiContainer>
    </Application>
  </div>
);
BaseClose.parameters = { backgrounds: { default: "transparent" } };

export const BaseOpen = () => (
  <div style={{ width: 120, height: 110 }}>
    <Application width={120} height={110} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiContainer x={20} y={20}>
        <pixiGraphics draw={(g) => { g.clear(); drawBreakerChassis(g, { step: 100 }, basePositions); }} />
        <pixiGraphics draw={drawThickSquares} />
        <pixiGraphics draw={(g) => drawNeutralBlade(g, "open")} />
      </pixiContainer>
    </Application>
  </div>
);
BaseOpen.parameters = { backgrounds: { default: "transparent" } };


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
