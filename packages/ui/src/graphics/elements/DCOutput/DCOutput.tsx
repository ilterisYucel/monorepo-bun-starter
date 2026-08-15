import React, { useCallback, useMemo } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { DCOutputProps } from "./DCOutput.types";
import { drawOutputBody, drawOutputGlow } from "./DCOutput.drawers";
import { DCOUTPUT_META } from "./dcoutput-meta";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";
import { hudTextStyle } from "../../hud";
import { COLOR } from "../../../colors";

export const DCOutput: React.FC<DCOutputProps> = ({ config, output, dcOutput }) => {
  const isActive = dcOutput?.status === "online";

  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawOutputBody(g, config, output, isActive);
    },
    [config, output, isActive],
  );

  const gGlowRef = usePixiTickerEffect(
    (g, time) => { drawOutputGlow(g, config, output, isActive, time); },
    [config, output, isActive],
  );

  const chassisTexture = useSpriteTexture("dcoutput");

  // Sprite canvas 100x112 @2x; daire merkezi (0.5, 46/112) — radius ile ölçeklenir
  const spriteGeom = useMemo(() => {
    if (!chassisTexture) return null;
    const r = output.radius;
    const w = r * (100 / 30);
    const h = r * (112 / 30);
    return {
      x: output.x - w / 2,
      y: output.y - h * (46 / 112),
      width: w,
      height: h,
    };
  }, [chassisTexture, output]);

  const display = useMemo(() => {
    if (!spriteGeom) return null;
    const m = DCOUTPUT_META.measured
      ? DCOUTPUT_META.display
      : { x: 0.22, y: 0.75, width: 0.56, height: 0.1429 };
    return {
      x: spriteGeom.x + m.x * spriteGeom.width,
      y: spriteGeom.y + m.y * spriteGeom.height,
      width: m.width * spriteGeom.width,
      height: m.height * spriteGeom.height,
    };
  }, [spriteGeom]);

  const displayFs = display ? Math.max(5, display.height * 0.4) : 7;
  const styleVolt = hudTextStyle({ size: displayFs, color: COLOR.textVoltage, glow: true });
  const styleAmp = hudTextStyle({ size: displayFs, color: COLOR.warningGlow, glow: true });

  const voltText = `${dcOutput?.voltage?.toFixed(1) ?? "0.0"}V`;
  const ampText = `${dcOutput?.current?.toFixed(1) ?? "0.0"}A`;

  return (
    <pixiContainer>
      {chassisTexture && spriteGeom ? (
        <>
          <pixiSprite
            texture={chassisTexture}
            x={spriteGeom.x}
            y={spriteGeom.y}
            width={spriteGeom.width}
            height={spriteGeom.height}
          />
          {display && (
            <>
              <pixiText
                text={voltText}
                x={display.x + display.width * 0.3}
                y={display.y + display.height * 0.3}
                anchor={0.5}
                style={styleVolt}
              />
              <pixiText
                text={ampText}
                x={display.x + display.width * 0.75}
                y={display.y + display.height * 0.3}
                anchor={0.5}
                style={styleAmp}
              />
            </>
          )}
        </>
      ) : (
        <pixiGraphics draw={drawBody} />
      )}
      <pixiGraphics draw={(g: GraphicsType) => { gGlowRef.current = g; }} />
    </pixiContainer>
  );
};

DCOutput.displayName = "DCOutput";
