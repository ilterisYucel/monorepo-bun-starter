import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { GridSymbolProps } from "./GridSymbol.types";
import { drawGridSymbol } from "./GridSymbol.drawers";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";

export const GridSymbol: React.FC<GridSymbolProps> = ({ x, y, width, height, config }) => {
  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawGridSymbol(g, x, y, width, height, config.step);
    },
    [x, y, width, height, config],
  );

  const bodyTexture = useSpriteTexture("grid");
  const margin = 6;

  return (
    <pixiContainer>
      {bodyTexture ? (
        <pixiSprite
          texture={bodyTexture}
          x={x - margin}
          y={y - margin}
          width={width + margin * 2}
          height={height + margin * 2}
        />
      ) : (
        <pixiGraphics draw={drawBody} />
      )}
    </pixiContainer>
  );
};

GridSymbol.displayName = "GridSymbol";
