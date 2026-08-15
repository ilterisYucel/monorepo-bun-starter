import React, { useCallback, useMemo } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { RoomCardProps } from "./RoomCard.types";
import { drawRoomBody, drawRoomTemp, drawRoomTempBorder, drawRoomBarSlot } from "./RoomCard.drawers";
import { ROOMCARD_META } from "./roomcard-meta";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";
import { COLOR } from "../../../colors";

export const RoomCard: React.FC<RoomCardProps> = ({ room, roomPos, config, minimal }) => {
  const bodyTexture = useSpriteTexture("roomcard");

  const tempSlot = useMemo(() => {
    if (!bodyTexture || !ROOMCARD_META.measured) return null;
    const m = ROOMCARD_META.tempSlot;
    return {
      x: roomPos.x + m.x * roomPos.width,
      y: roomPos.y + m.y * roomPos.height,
      width: m.width * roomPos.width,
      height: m.height * roomPos.height,
    };
  }, [bodyTexture, roomPos]);

  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawRoomBody(g, roomPos, config); },
    [roomPos, config],
  );

  const drawBarSlot = useCallback(
    (g: GraphicsType) => { g.clear(); drawRoomBarSlot(g, roomPos, config); },
    [roomPos, config],
  );

  const drawTempBar = useCallback(
    (g: GraphicsType) => {
      g.clear();
      if (tempSlot) {
        drawRoomTemp(g, roomPos, room.temp, config, tempSlot);
      } else {
        drawRoomTempBorder(g, roomPos, config);
        drawRoomTemp(g, roomPos, room.temp, config);
      }
    },
    [roomPos, room.temp, config, tempSlot],
  );

  const margin = 5;

  const fs = Math.max(10, config.step * 0.3);
  const smallFs = Math.max(7, config.step * 0.17);

  return (
    <pixiContainer>
      {bodyTexture ? (
        <pixiSprite
          texture={bodyTexture}
          x={roomPos.x - margin}
          y={roomPos.y - margin}
          width={roomPos.width + margin * 2}
          height={roomPos.height + margin * 2}
        />
      ) : (
        <>
          <pixiGraphics draw={drawBody} />
          <pixiGraphics draw={drawBarSlot} />
        </>
      )}
      <pixiGraphics draw={drawTempBar} />
      <pixiText text={`O${roomPos.index + 1}`} x={roomPos.x + roomPos.width / 2}
        y={roomPos.y + config.step * 0.7} anchor={0.5}
        style={{ fontSize: fs, fill: COLOR.textPrimary, fontFamily: "monospace", fontWeight: "bold" }} />
      <pixiText text={`${room.temp.toFixed(1)}°C`} x={roomPos.x + roomPos.width / 2}
        y={roomPos.y + config.step * 1.5} anchor={0.5}
        style={{ fontSize: Math.max(11, config.step * 0.28), fill: COLOR.textWhite, fontFamily: "monospace", fontWeight: "bold" }} />
      {!minimal && room.setTemp != null && (
        <pixiText text={`➤ ${room.setTemp.toFixed(1)}°C`} x={roomPos.x + roomPos.width / 2}
          y={roomPos.y + config.step * 2.2} anchor={0.5}
          style={{ fontSize: smallFs, fill: COLOR.textMuted, fontFamily: "monospace" }} />
      )}
      {!minimal && room.humidity != null && (
        <pixiText text={`💧 %${room.humidity.toFixed(0)}`} x={roomPos.x + roomPos.width / 2}
          y={roomPos.y + config.step * 2.8} anchor={0.5}
          style={{ fontSize: smallFs, fill: COLOR.info, fontFamily: "monospace" }} />
      )}
    </pixiContainer>
  );
};

RoomCard.displayName = "RoomCard";
