import React, { useCallback } from "react";
import { COLOR } from "../../../colors";
import type { Graphics as GraphicsType } from "pixi.js";
import type { HvacUnitProps } from "./HvacUnit.types";
import { drawHvacBody, drawHvacStatus, drawHvacAnim } from "./HvacUnit.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";

export const HvacUnit: React.FC<HvacUnitProps> = ({ hvac, pos, config, minimal }) => {
  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawHvacBody(g, pos, hvac, config); },
    [pos, hvac, config],
  );

  const drawStatus = useCallback(
    (g: GraphicsType) => { g.clear(); drawHvacStatus(g, pos, hvac, config); },
    [pos, hvac, config],
  );

  const gAnimRef = usePixiTickerEffect(
    (g, time) => { drawHvacAnim(g, pos, hvac, config, time); },
    [pos, hvac, config],
  );

  const bodyTexture = useSpriteTexture("hvacunit");
  const margin = 5;

  const fs = Math.max(7, config.step * 0.2);
  const detailFs = Math.max(6, config.step * 0.15);
  const hasAlarm = (hvac.alarmCount ?? 0) > 0;

  return (
    <pixiContainer>
      {bodyTexture ? (
        <>
          <pixiSprite
            texture={bodyTexture}
            x={pos.x - margin}
            y={pos.y - margin}
            width={pos.width + margin * 2}
            height={pos.height + margin * 2}
          />
          <pixiGraphics draw={drawStatus} />
        </>
      ) : (
        <pixiGraphics draw={drawBody} />
      )}
      <pixiGraphics draw={(g: GraphicsType) => { gAnimRef.current = g; }} />
      <pixiText
        text={hvac.mode === "cooling" ? "COOL" : hvac.mode === "warming" ? "WARM" : "IDLE"}
        x={pos.x + pos.width / 2} y={pos.y + pos.height * 0.5} anchor={0.5}
        style={{ fontSize: fs, fill: hvac.status === "online" ? (hvac.mode === "cooling" ? COLOR.info : hvac.mode === "warming" ? COLOR.warning : COLOR.textMuted) : COLOR.error, fontFamily: "monospace", fontWeight: "bold" }} />
      {!minimal && (
        <>
          {hvac.equipmentStatus && (
            <pixiText
              text={hvac.equipmentStatus}
              x={pos.x + pos.width / 2} y={pos.y + pos.height * 0.5} anchor={0.5}
              style={{ fontSize: detailFs, fill: COLOR.textWhite, fontFamily: "monospace" }} />
          )}
          {hvac.supplyTemp != null && (
            <pixiText
              text={`📤 ${hvac.supplyTemp.toFixed(1)}°`}
              x={pos.x + pos.width / 2} y={pos.y + pos.height * 0.68} anchor={0.5}
              style={{ fontSize: detailFs, fill: COLOR.textMuted, fontFamily: "monospace" }} />
          )}
          {hvac.returnTemp != null && (
            <pixiText
              text={`📥 ${hvac.returnTemp.toFixed(1)}°`}
              x={pos.x + pos.width / 2} y={pos.y + pos.height * 0.82} anchor={0.5}
              style={{ fontSize: detailFs, fill: COLOR.textVoltage, fontFamily: "monospace" }} />
          )}
          <pixiText
            text={`⚠️ ${hvac.alarmCount ?? 0}`}
            x={pos.x + pos.width / 2} y={pos.y + pos.height * 0.94} anchor={0.5}
            style={{ fontSize: detailFs, fill: hasAlarm ? COLOR.warning : COLOR.textMuted, fontFamily: "monospace", fontWeight: "bold" }} />
        </>
      )}
    </pixiContainer>
  );
};

HvacUnit.displayName = "HvacUnit";
