import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text } from "pixi.js";
import { usePixiZoom } from "./usePixiZoom";
import { COLORS, COLOR } from "../colors";

extend({ Container, Graphics, Text });

const meta: Meta = {
  title: "Hooks/usePixiZoom",
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

const Demo: React.FC = () => {
  const zoom = usePixiZoom({ enabled: true, scale: 2 });

  return (
    <div
      style={{
        width: 400,
        height: 260,
        cursor: "zoom-in",
        background: COLORS.bgCard,
        borderRadius: 12,
        overflow: "hidden",
      }}
      onMouseEnter={zoom.onMouseEnter}
      onMouseMove={zoom.onMouseMove}
      onMouseLeave={zoom.onMouseLeave}
    >
      <Application width={400} height={260} background={COLOR.bgCard} antialias={false} resolution={1} onInit={zoom.onAppInit}>
        <pixiGraphics
          draw={(g) => {
            g.clear();
            g.circle(200, 130, 60);
            g.fill({ color: 0x1e90ff });
          }}
        />
        <pixiText
          text="Büyüteç: üzerine gel"
          x={10}
          y={10}
          style={{ fill: 0xffffff, fontSize: 14 }}
        />
      </Application>
    </div>
  );
};

export const Magnifier: Story = {
  render: () => <Demo />,
};
