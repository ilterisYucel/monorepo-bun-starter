import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { DCOutputProps } from "./DCOutput.types";
import { drawOutputBody, drawOutputGlow } from "./DCOutput.drawers";

export const DCOutput: React.FC<DCOutputProps> = ({
  config,
  output,
  dcOutput,
  timestampRef,
  frameCount,
}) => {
  const isActive = dcOutput?.status === "online";

  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawOutputBody(g, config, output, isActive);
    },
    [config, output, isActive],
  );

  const drawGlow = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawOutputGlow(g, config, output, isActive, timestampRef);
    },
    [config, output, isActive, frameCount],
  );

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={drawGlow} />
    </pixiContainer>
  );
};

DCOutput.displayName = "DCOutput";
