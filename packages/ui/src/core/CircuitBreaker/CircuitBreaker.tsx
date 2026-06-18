import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { CircuitBreakerProps } from "./CircuitBreaker.types";
import { drawBreakerBody, drawBreakerPulse } from "./CircuitBreaker.drawers";

export const CircuitBreaker: React.FC<CircuitBreakerProps> = ({
  config,
  positions,
  breakerStatus,
  breakerPosition,
  timestampRef,
  frameCount,
  onClick,
}) => {
  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawBreakerBody(g, config, positions, breakerStatus, breakerPosition);
    },
    [config, positions, breakerStatus, breakerPosition],
  );

  const drawPulse = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawBreakerPulse(g, config, positions, breakerStatus, breakerPosition, timestampRef);
    },
    [config, positions, breakerStatus, breakerPosition, frameCount],
  );

  const {
    circuitBreaker: cb,
    convergence: cv,
    topBusY,
    bottomBusY,
  } = positions;
  const centerY = (topBusY + bottomBusY) / 2;
  const lineStartX = cv.x + config.step * 0.2;
  const by = centerY - config.step * 0.5;
  const bh = config.step * 1.0;

  return (
    <pixiContainer
      cursor="pointer"
      eventMode="static"
      onClick={onClick}
    >
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={drawPulse} />
      {/* Invisible hit area */}
      <pixiGraphics
        draw={(g: GraphicsType) => {
          g.clear();
          g.rect(lineStartX - config.step * 0.1, by, cb.endX - lineStartX + config.step * 0.3, bh);
          g.fill({ color: 0xffffff, alpha: 0.001 });
        }}
      />
    </pixiContainer>
  );
};

CircuitBreaker.displayName = "CircuitBreaker";
