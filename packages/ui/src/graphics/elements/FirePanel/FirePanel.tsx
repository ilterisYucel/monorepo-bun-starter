import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { FirePanelProps } from "./FirePanel.types";
import {
  drawPanelBody,
  drawLamp,
  drawKeySwitch,
  drawLabelBox,
  LAMP_DEFS,
  KEY_DEFS,
} from "./FirePanel.drawers";
import type { LampDef } from "./FirePanel.drawers";
import { usePixiTickerEffect } from "../../hooks/usePixiTickerEffect";
import { COLOR } from "../../../colors";

export const FirePanel: React.FC<FirePanelProps> = ({
  data, x, y, width: w, height: h, config,
}) => {
  const { step } = config;

  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawPanelBody(g, x, y, w, h, data, config); },
    [x, y, w, h, data, config],
  );

  const gLampsRef = usePixiTickerEffect(
    (g, time) => {
      const lampRadius = Math.max(3, step * 0.22);
      const lampGap = step * 0.5;
      const lampsPerRow = 3;
      const totalLampW = lampsPerRow * lampRadius * 2 + (lampsPerRow - 1) * lampGap;
      const lampStartX = x + (w - totalLampW) / 2;
      const lampY1 = y + h * 0.15;
      const lampY2 = y + h * 0.30;
      const pulse = (Math.sin(time * 6.0) + 1) / 2;
      const d = data as unknown as Record<string, boolean>;

      for (let i = 0; i < LAMP_DEFS.length; i++) {
        const def = LAMP_DEFS[i]!;
        const active = !!d[def.key];
        const col = i < 3 ? i : i - 3;
        const cy = i < 3 ? lampY1 : lampY2;
        const cx = lampStartX + col * (lampRadius * 2 + lampGap) + lampRadius;
        drawLamp(g, cx, cy, lampRadius, active, def.colorActive, def.colorGlow, pulse, step);
      }
    },
    [data, x, y, w, h, config],
  );

  const drawKeys = useCallback(
    (g: GraphicsType) => {
      const keyW = step * 1.2;
      const keyH = step * 0.8;
      const keyGap = step * 0.3;
      const totalKeyW = KEY_DEFS.length * keyW + (KEY_DEFS.length - 1) * keyGap;
      const keyStartX = x + (w - totalKeyW) / 2;
      const keyY = y + h * 0.46;
      const modeActive = data.modeAuto;

      for (let i = 0; i < KEY_DEFS.length; i++) {
        const isActive = i === 3 ? modeActive : false;
        drawKeySwitch(g, keyStartX + i * (keyW + keyGap), keyY, keyW, keyH, isActive, step);
      }
    },
    [data, x, y, w, h, config],
  );

  const titleFs = Math.max(7, step * 0.22);
  const labelFs = Math.max(6, step * 0.15);
  const smallFs = Math.max(5, step * 0.13);

  const lampRadius = Math.max(3, step * 0.22);
  const lampGap = step * 0.5;
  const lampsPerRow = 3;
  const totalLampW = lampsPerRow * lampRadius * 2 + (lampsPerRow - 1) * lampGap;
  const lampStartX = x + (w - totalLampW) / 2;
  const lampY1 = y + h * 0.15;
  const lampY2 = y + h * 0.30;
  const labelY1 = lampY1 + lampRadius + step * 0.08;
  const labelY2 = lampY2 + lampRadius + step * 0.08;

  const modeStatus = data.modeAuto ? "AUTO" : "MANUAL";
  const modeColor = data.modeAuto ? COLOR.info : COLOR.warning;

  const d = data as unknown as Record<string, boolean>;

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={(g: GraphicsType) => { gLampsRef.current = g; }} />
      <pixiGraphics draw={drawKeys} />

      <pixiGraphics
        draw={(g: GraphicsType) => {
          g.clear();
          const boxW = w * 0.7;
          const boxH = step * 0.35;
          drawLabelBox(g, x + (w - boxW) / 2, y + step * 0.08, boxW, boxH, COLOR.borderStroke, 0.5, step);
        }}
      />
      <pixiText
        text={"YANGIN PANOSU (EP203)"}
        x={x + w / 2} y={y + step * 0.08 + step * 0.175} anchor={0.5}
        style={{ fontSize: titleFs, fill: data.fire ? COLOR.error : COLOR.textLight, fontFamily: "monospace", fontWeight: "bold" }}
      />

      {LAMP_DEFS.map((def: LampDef, i: number) => {
        const col = i < 3 ? i : i - 3;
        const cy = i < 3 ? lampY1 : lampY2;
        const ly = i < 3 ? labelY1 : labelY2;
        const cx = lampStartX + col * (lampRadius * 2 + lampGap) + lampRadius;
        const active = !!d[def.key];
        return (
          <pixiContainer key={def.key}>
            <pixiGraphics
              draw={(g: GraphicsType) => {
                g.clear();
                const boxW = step * 1.0;
                const boxH = step * 0.26;
                drawLabelBox(g, cx - boxW / 2, ly, boxW, boxH, active ? def.colorActive : COLOR.borderStroke, active ? 0.5 : 0.3, step);
              }}
            />
            <pixiText
              text={def.label}
              x={cx} y={ly + step * 0.13} anchor={0.5}
              style={{ fontSize: labelFs, fill: active ? def.colorActive : COLOR.textMuted, fontFamily: "monospace", fontWeight: "bold" }}
            />
          </pixiContainer>
        );
      })}

      {KEY_DEFS.map((kd: { label: string; sublabel: string }, i: number) => {
        const keyW = step * 1.2;
        const keyGap = step * 0.3;
        const totalKeyW = KEY_DEFS.length * keyW + (KEY_DEFS.length - 1) * keyGap;
        const keyStartX = x + (w - totalKeyW) / 2;
        const keyY = y + h * 0.46;
        const keyH = step * 0.8;
        const kx = keyStartX + i * (keyW + keyGap);
        return (
          <pixiContainer key={kd.label}>
            <pixiGraphics
              draw={(g: GraphicsType) => {
                g.clear();
                const boxW = keyW * 0.9;
                const boxH = step * 0.24;
                drawLabelBox(g, kx + keyW / 2 - boxW / 2, keyY + keyH + step * 0.08, boxW, boxH, COLOR.borderStroke, 0.3, step);
              }}
            />
            <pixiText
              text={kd.label}
              x={kx + keyW / 2} y={keyY + keyH + step * 0.08 + step * 0.12} anchor={0.5}
              style={{ fontSize: labelFs, fill: COLOR.textMuted, fontFamily: "monospace", fontWeight: "bold" }}
            />
          </pixiContainer>
        );
      })}

      <pixiGraphics
        draw={(g: GraphicsType) => {
          g.clear();
          const boxW = step * 2.2;
          const boxH = step * 0.28;
          const bx = x + w / 2 - boxW / 2;
          const by = y + h - step * 0.6;
          drawLabelBox(g, bx, by, boxW, boxH, modeColor, 0.5, step);
        }}
      />
      <pixiText
        text={`KIP: ${modeStatus}`}
        x={x + w / 2} y={y + h - step * 0.6 + step * 0.14} anchor={0.5}
        style={{ fontSize: smallFs, fill: modeColor, fontFamily: "monospace", fontWeight: "bold" }}
      />

      <pixiGraphics
        draw={(g: GraphicsType) => {
          g.clear();
          const boxW = step * 1.6;
          const boxH = step * 0.28;
          const bx = x + w / 2 - boxW / 2;
          const by = y + h - step * 0.28;
          const heldColor = data.hold ? COLOR.warning : data.abort ? COLOR.error : COLOR.textMuted;
          drawLabelBox(g, bx, by, boxW, boxH, heldColor, 0.4, step);
        }}
      />
      <pixiText
        text={data.hold ? "BEKLEMEDE" : data.abort ? "IPTAL" : "HAZIR"}
        x={x + w / 2} y={y + h - step * 0.28 + step * 0.14} anchor={0.5}
        style={{ fontSize: smallFs, fill: data.hold ? COLOR.warning : data.abort ? COLOR.error : COLOR.success, fontFamily: "monospace", fontWeight: "bold" }}
      />
    </pixiContainer>
  );
};

FirePanel.displayName = "FirePanel";
