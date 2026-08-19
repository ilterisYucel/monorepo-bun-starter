import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { CircuitBreakerProps } from "./CircuitBreaker.types";
import { breakerSymbolRect, drawBreakerBody, drawBreakerChassis } from "./CircuitBreaker.drawers";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";
import { hudTextStyle } from "../../hud";
import { COLOR } from "../../../colors";

// Kesici şema sembolü: iç içe 2 kare sprite (kablo grisi) + bıçak sprite'ta
// gömülü (kapalı/açık varyant). Offline: bıçaksız kod çizimi (boş çift kare).
// Durum metni sembolün altında yüzer.
export const CircuitBreaker: React.FC<CircuitBreakerProps> = ({
  config,
  positions,
  breakerStatus,
  breakerPosition,
  onClick,
}) => {
  const { step } = config;
  const rect = breakerSymbolRect(config, positions);

  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawBreakerBody(g, config, positions, breakerStatus, breakerPosition);
    },
    [config, positions, breakerStatus, breakerPosition],
  );

  const drawChassisOnly = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawBreakerChassis(g, config, positions);
    },
    [config, positions],
  );

  const chassisTexture = useSpriteTexture(
    breakerPosition === "close" ? "circuitbreaker-close" : "circuitbreaker-open",
  );

  const statusColor = breakerStatus === "online" ? COLOR.success : COLOR.error;
  const posColor = breakerPosition === "close" ? COLOR.success : COLOR.warning;
  const textFs = Math.max(6, step * 0.15);
  const styleStatus = hudTextStyle({ size: textFs, color: statusColor, bold: true, glow: true });
  const stylePos = hudTextStyle({ size: textFs, color: posColor, bold: true, glow: true });

  const labelY = rect.y + rect.height + step * 0.16;
  const labelX = rect.x + rect.width / 2;

  return (
    <pixiContainer cursor={onClick ? "pointer" : "none"} eventMode={onClick ? "static" : "none"} onClick={onClick}>
      {breakerStatus === "offline" ? (
        <pixiGraphics draw={drawChassisOnly} />
      ) : chassisTexture ? (
        <pixiSprite
          texture={chassisTexture}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
        />
      ) : (
        <pixiGraphics draw={drawBody} />
      )}
      <pixiText
        text={breakerStatus === "online" ? "ONLINE" : "OFFLINE"}
        x={labelX}
        y={labelY}
        anchor={0.5}
        style={styleStatus}
      />
      <pixiText
        text={breakerPosition === "close" ? "CLOSED" : "OPEN"}
        x={labelX}
        y={labelY + textFs + 2}
        anchor={0.5}
        style={stylePos}
      />
      <pixiGraphics
        draw={(g: GraphicsType) => {
          g.clear();
          g.rect(rect.x - step * 0.1, rect.y - step * 0.2, rect.width + step * 0.2, rect.height + step * 0.9);
          g.fill({ color: COLOR.textWhite, alpha: 0.001 });
        }}
      />
    </pixiContainer>
  );
};

CircuitBreaker.displayName = "CircuitBreaker";
