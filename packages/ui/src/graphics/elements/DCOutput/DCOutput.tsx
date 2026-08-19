import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { DCOutputProps } from "./DCOutput.types";
import { drawOutputBody } from "./DCOutput.drawers";
import { hudTextStyle } from "../../hud";
import { COLOR } from "../../../colors";

// DC çıkış şema sembolü: kod çizimli iç içe 2 ince çember (içi transparent).
// İçinde büyük +/− işaretleri, altında tek hizada alt alta V/A etiketleri
// (CB durum metinleriyle aynı font boyu). Pulse animasyonu YOK.
export const DCOutput: React.FC<DCOutputProps> = ({ config, output, dcOutput }) => {
  const isActive = dcOutput?.status === "online";
  const { step } = config;

  const drawBody = useCallback(
    (g: GraphicsType) => {
      g.clear();
      drawOutputBody(g, config, output);
    },
    [config, output],
  );

  const or = output.radius;
  const textFs = Math.max(6, step * 0.15);
  // CB alt yazılarıyla aynı stil: boyut, kalınlık, glow.
  const styleVolt = hudTextStyle({ size: textFs, color: isActive ? COLOR.textVoltage : COLOR.textMuted, bold: true, glow: true });
  const styleAmp = hudTextStyle({ size: textFs, color: isActive ? COLOR.warningGlow : COLOR.textMuted, bold: true, glow: true });
  const stylePol = hudTextStyle({ size: Math.max(8, step * 0.22), color: isActive ? COLOR.textLight : COLOR.idle, bold: true });

  const voltText = `${dcOutput?.voltage?.toFixed(1) ?? "0.0"}V`;
  const ampText = `${dcOutput?.current?.toFixed(1) ?? "0.0"}A`;
  const labelY = output.y + or + step * 0.26;

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBody} />
      <pixiText text={"+"} x={output.x} y={output.y - or * 0.24} anchor={0.5} style={stylePol} />
      <pixiText text={"-"} x={output.x} y={output.y + or * 0.18} anchor={0.5} style={stylePol} />
      <pixiText text={voltText} x={output.x} y={labelY} anchor={0.5} style={styleVolt} />
      <pixiText text={ampText} x={output.x} y={labelY + textFs + 2} anchor={0.5} style={styleAmp} />
    </pixiContainer>
  );
};

DCOutput.displayName = "DCOutput";
