import React, { useCallback, useMemo } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { CircuitBreakerProps } from "./CircuitBreaker.types";
import { drawBreakerBody, drawBreakerPulse } from "./CircuitBreaker.drawers";
import { CIRCUITBREAKER_META } from "./circuitbreaker-meta";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";
import { hudTextStyle } from "../../hud";
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

  const chassisTexture = useSpriteTexture(
    breakerPosition === "close" ? "circuitbreaker-close" : "circuitbreaker-open",
  );
  const chassisX = lineStartX - config.step * 0.1;
  const chassisY = centerY - config.step * 0.35;
  const chassisW = cb.endX - lineStartX + config.step * 0.2;
  const chassisH = config.step * 0.7;

  // Sprite canvas: chassis 80x21 @ (12,12) — marjlar chassis ile orantılı ölçeklenir
  const marginX = chassisW * 0.15;
  const marginY = chassisH * (12 / 21);

  const display = useMemo(() => {
    if (!chassisTexture) return null;
    const design = { x: 0.25, y: 0.2143, width: 0.5, height: 0.5714 };
    const m = CIRCUITBREAKER_META.measured
      ? breakerPosition === "close"
        ? CIRCUITBREAKER_META.displayClosed
        : CIRCUITBREAKER_META.displayOpen
      : design;
    return {
      x: chassisX + m.x * chassisW,
      y: chassisY + m.y * chassisH,
      width: m.width * chassisW,
      height: m.height * chassisH,
    };
  }, [chassisTexture, chassisX, chassisY, chassisW, chassisH, breakerPosition]);

  const statusColor = breakerStatus === "online" ? COLOR.success : COLOR.error;
  const posColor = breakerPosition === "close" ? COLOR.success : COLOR.warning;
  const displayFs = display ? Math.max(5, display.height * 0.36) : 7;
  const styleStatus = hudTextStyle({ size: displayFs, color: statusColor, bold: true, glow: true });
  const stylePos = hudTextStyle({ size: displayFs, color: posColor, bold: true, glow: true });

  return (
    <pixiContainer cursor={onClick ? "pointer" : "none"} eventMode={onClick ? "static" : "none"} onClick={onClick}>
      {chassisTexture ? (
        <>
          <pixiSprite
            texture={chassisTexture}
            x={chassisX - marginX}
            y={chassisY - marginY}
            width={chassisW + marginX * 2}
            height={chassisH + marginY * 2}
          />
          {display && (
            <>
              <pixiText
                text={breakerStatus === "online" ? "ONLINE" : "OFFLINE"}
                x={display.x + display.width / 2}
                y={display.y + display.height * 0.28}
                anchor={0.5}
                style={styleStatus}
              />
              <pixiText
                text={breakerPosition === "close" ? "CLOSED" : "OPEN"}
                x={display.x + display.width / 2}
                y={display.y + display.height * 0.72}
                anchor={0.5}
                style={stylePos}
              />
            </>
          )}
        </>
      ) : (
        <pixiGraphics draw={drawBody} />
      )}
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
