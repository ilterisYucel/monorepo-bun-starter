import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { CircuitBreaker } from "@gd-monorepo/ui";

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
