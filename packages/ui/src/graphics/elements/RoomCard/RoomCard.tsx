import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { RoomCardProps } from "./RoomCard.types";
import { drawRoomBody, drawRoomTemp, drawRoomTempBorder } from "./RoomCard.drawers";

export const RoomCard: React.FC<RoomCardProps> = ({ room, roomPos, config }) => {
  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawRoomBody(g, roomPos, config); },
    [roomPos, config],
  );

  const drawTempBar = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawRoomTempBorder(g, roomPos, config);
      drawRoomTemp(g, roomPos, room.temp, config);
    },
    [roomPos, room.temp, config],
  );

  const fs = Math.max(10, config.step * 0.3);

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={drawTempBar} />
      <pixiText text={`O${roomPos.index + 1}`} x={roomPos.x + roomPos.width / 2}
        y={roomPos.y + config.step * 0.7} anchor={0.5}
        style={{ fontSize: fs, fill: 0xe5e7eb, fontFamily: "monospace", fontWeight: "bold" }} />
      <pixiText text={`${room.temp.toFixed(1)}°C`} x={roomPos.x + roomPos.width / 2}
        y={roomPos.y + config.step * 1.5} anchor={0.5}
        style={{ fontSize: Math.max(11, config.step * 0.28), fill: 0xffffff, fontFamily: "monospace", fontWeight: "bold" }} />
    </pixiContainer>
  );
};

RoomCard.displayName = "RoomCard";
