import React, { useCallback } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { CableProps } from "./Cable.types";
import { drawCableBody, drawCableArrows, getCableColor } from "./Cable.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";

export const Cable: React.FC<CableProps> = ({ path, flowDirection, step, color }) => {
  const cl = color ?? getCableColor();
  const th = Math.max(2.5, step * 0.1);
  const as = Math.max(4, step * 0.12);

  const drawBody = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      drawCableBody(g, path, cl, th);
    },
    [path, cl, th],
  );

  const gAnimRef = usePixiTickerEffect(
    (g, time) => { drawCableArrows(g, path, flowDirection, time, as); },
    [path, flowDirection, as],
  );

  return (
    <>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={(g: PixiGraphics) => { gAnimRef.current = g; }} />
    </>
  );
};

Cable.displayName = "Cable";
