import React from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { RoomCard } from "@gd-monorepo/ui";
import { createMockRoomData } from "../../../__stories__/mocks/factories";

extend({ Container, Graphics, Text, Sprite });

const meta = {
  title: "Graphics/RoomCard",
  component: RoomCard,
  tags: ["autodocs"],
};
export default meta;

const roomPos = {
  index: 0,
  x: 10, y: 10,
  width: 120, height: 180,
  hvac1: { x: 15, y: 30, width: 50, height: 80 },
  hvac2: { x: 75, y: 30, width: 50, height: 80 },
};
const config = { step: 30 };
const wrapper = { width: 160, height: 220, background: "#0f0f1a" } as const;

export const RoomO1 = () => (
  <div style={wrapper}>
    <Application width={160} height={220} background={0x0f0f1a} antialias={false} resolution={1}>
      <RoomCard room={createMockRoomData(22)} roomPos={roomPos} config={config} />
    </Application>
  </div>
);

export const RoomO2 = () => (
  <div style={wrapper}>
    <Application width={160} height={220} background={0x0f0f1a} antialias={false} resolution={1}>
      <RoomCard room={createMockRoomData(35)} roomPos={roomPos} config={config} />
    </Application>
  </div>
);
