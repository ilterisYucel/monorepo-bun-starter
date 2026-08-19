import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { DCOutput } from "@gd-monorepo/ui";
import { createMockOutputPosition } from "../../../__stories__/mocks/factories";
import { drawOutputChassis } from "./DCOutput.drawers";
import { SpriteTextureProvider } from "../../../core/SpriteTextureProvider";
import { SPRITE_ASSETS } from "../../textures";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/DCOutput",
  component: DCOutput,
  tags: ["autodocs"],
};
export default meta;

const config = { step: 30 };
const output = createMockOutputPosition(50, 50, 30);
const wrapper = { width: 120, height: 120, background: "#0f0f1a" } as const;

export const Base = () => (
  <div style={{ width: 100, height: 112 }}>
    <Application width={100} height={112} backgroundAlpha={0} antialias={false} resolution={1}>
      <pixiGraphics
        draw={(g) => {
          g.clear();
          drawOutputChassis(g, config, { x: 50, y: 46, radius: 30 });
        }}
      />
    </Application>
  </div>
);
Base.parameters = { backgrounds: { default: "transparent" } };

export const SpriteMode = () => (
  <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <SpriteTextureProvider assets={SPRITE_ASSETS}>
        <DCOutput
          config={config}
          output={output}
          dcOutput={{ status: "online", voltage: 48.0, current: 12.5 }}
        />
      </SpriteTextureProvider>
    </Application>
  </div>
);


export const Active = () => (
  <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput
        config={config}
        output={output}
        dcOutput={{ status: "online", voltage: 48.0, current: 12.5 }}
      />
    </Application>
  </div>
);

export const Idle = () => (
  <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput
        config={config}
        output={output}
        dcOutput={{ status: "offline", voltage: 0, current: 0 }}
      />
    </Application>
  </div>
);

export const NoDcOutput = () => (
  <div style={wrapper}>
    <Application width={120} height={120} background={0x0f0f1a} antialias={false} resolution={1}>
      <DCOutput config={config} output={output} />
    </Application>
  </div>
);
