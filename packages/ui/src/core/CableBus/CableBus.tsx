import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { CableBusProps } from "./CableBus.types";
import { drawCables } from "./CableBus.drawers";

export const CableBus: React.FC<CableBusProps> = ({ config, positions }) => {
  const draw = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawCables(g, config, positions);
    },
    [config, positions],
  );

  return <pixiGraphics draw={draw} />;
};

CableBus.displayName = "CableBus";
