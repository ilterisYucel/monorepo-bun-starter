import React, { useCallback, useMemo } from "react";
import type { Graphics as PixiGraphics } from "pixi.js";
import type { CableProps } from "./Cable.types";
import { drawCableBody, drawCableArrows, getCableColor } from "./Cable.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { useSpriteTexture } from "../../../core/SpriteTextureProvider";

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

  const cableTexture = useSpriteTexture("cable");

  // Segment sprite'ları: her düz segment için texture döndürülüp uzatılır.
  // Texture canvas 212x48 mantıksal; kablo uçlarda ~6px marj içinde çizilir.
  const segments = useMemo(() => {
    if (!cableTexture || path.length < 2) return null;
    const endPad = 6;
    const texH = 48;
    return path.slice(0, -1).map((p1, i) => {
      const p2 = path[i + 1]!;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return null;
      return {
        key: i,
        x: p1.x + dx / 2,
        y: p1.y + dy / 2,
        rotation: Math.atan2(dy, dx),
        width: len + endPad * 2,
        height: texH,
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);
  }, [cableTexture, path]);

  return (
    <>
      {segments ? (
        <>
          {segments.map((s) => (
            <pixiSprite
              key={`seg-${s.key}`}
              texture={cableTexture}
              anchor={0.5}
              x={s.x}
              y={s.y}
              rotation={s.rotation}
              width={s.width}
              height={s.height}
            />
          ))}
          <pixiGraphics draw={(g: PixiGraphics) => { gAnimRef.current = g; }} />
        </>
      ) : (
        <>
          <pixiGraphics draw={drawBody} />
          <pixiGraphics draw={(g: PixiGraphics) => { gAnimRef.current = g; }} />
        </>
      )}
    </>
  );
};

Cable.displayName = "Cable";
