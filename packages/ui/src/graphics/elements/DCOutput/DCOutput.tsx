import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { DCOutputProps } from "./DCOutput.types";
import { drawOutputBody, drawOutputBolt, drawOutputGlow } from "./DCOutput.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";

export const DCOutput: React.FC<DCOutputProps> = ({ config, output, dcOutput }) => {
  const isActive = dcOutput?.status === "online";

  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawOutputBody(g, config, output, isActive);
    },
    [config, output, isActive],
  );

  const drawBolt = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawOutputBolt(g, config, output, isActive);
    },
    [config, output, isActive],
  );

  const gGlowRef = usePixiTickerEffect(
    (g, time) => { drawOutputGlow(g, config, output, isActive, time); },
    [config, output, isActive],
  );

  const chassisTexture = useSpriteTexture("dcoutput");
  const chassisSide = output.radius * 2 + 4;
  const chassisX = output.x - chassisSide / 2;
  const chassisY = output.y - chassisSide / 2;

  return (
    <pixiContainer>
      {chassisTexture ? (
        <>
          <pixiSprite
            texture={chassisTexture}
            x={chassisX}
            y={chassisY}
            width={chassisSide}
            height={chassisSide}
          />
          <pixiGraphics draw={drawBolt} />
        </>
      ) : (
        <pixiGraphics draw={drawBody} />
      )}
      <pixiGraphics draw={(g: GraphicsType) => { gGlowRef.current = g; }} />
    </pixiContainer>
  );
};

DCOutput.displayName = "DCOutput";
