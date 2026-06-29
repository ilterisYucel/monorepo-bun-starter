import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { CircuitBreakerProps } from "./CircuitBreaker.types";
import { drawBreakerBody, drawBreakerPulse } from "./CircuitBreaker.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { COLOR } from "../../../colors";

export const CircuitBreaker: React.FC<CircuitBreakerProps> = ({
  config,
  positions,
  breakerStatus,
  breakerPosition,
  onClick,
}) => {
  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawBreakerBody(g, config, positions, breakerStatus, breakerPosition);
    },
    [config, positions, breakerStatus, breakerPosition],
  );

  const gPulseRef = usePixiTickerEffect(
    (g, time) => { drawBreakerPulse(g, config, positions, breakerStatus, breakerPosition, time); },
    [config, positions, breakerStatus, breakerPosition],
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
    <pixiContainer cursor="pointer" eventMode="static" onClick={onClick}>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={(g: GraphicsType) => { gPulseRef.current = g; }} />
      <pixiGraphics
        draw={(g: GraphicsType) => {
          g.clear();
          g.rect(lineStartX - config.step * 0.1, by, cb.endX - lineStartX + config.step * 0.3, bh);
          g.fill({ color: COLOR.textWhite, alpha: 0.001 });
        }}
      />
    </pixiContainer>
  );
};

CircuitBreaker.displayName = "CircuitBreaker";
