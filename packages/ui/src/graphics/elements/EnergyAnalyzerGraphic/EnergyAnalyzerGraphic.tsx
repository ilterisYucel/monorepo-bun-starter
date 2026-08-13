import React, { useCallback } from "react";
import type { Graphics as GraphicsType } from "pixi.js";
import type { EnergyAnalyzerGraphicProps } from "./EnergyAnalyzerGraphic.types";
import { drawEABody, drawLCDScreen, drawLabelBox, ROW_LABELS } from "./EnergyAnalyzerGraphic.drawers";
import { COLOR } from "../../../colors";

export const EnergyAnalyzerGraphic: React.FC<EnergyAnalyzerGraphicProps> = ({
  data, x, y, width: w, height: h, config, label = "DC GUC ANALIZORU",
}) => {
  const { step } = config;

  const drawBody = useCallback(
    (g: GraphicsType) => { g.clear(); drawEABody(g, x, y, w, h, config); },
    [x, y, w, h, config],
  );

  const lcdX = x + step * 0.15;
  const lcdY = y + step * 0.5;
  const lcdW = w - step * 0.3;
  const lcdH = h * 0.52;

  const drawLCD = useCallback(
    (g: GraphicsType) => { g.clear(); drawLCDScreen(g, lcdX, lcdY, lcdW, lcdH, step); },
    [lcdX, lcdY, lcdW, lcdH, step],
  );

  const titleFs = Math.max(7, step * 0.22);
  const valueFs = Math.max(7, step * 0.20);
  const labelFs = Math.max(6, step * 0.17);
  const btnFs = Math.max(6, step * 0.14);

  const rowHeight = lcdH / ROW_LABELS.length;
  const values: Record<string, string> = {
    V: data.voltage != null ? `${data.voltage.toFixed(1)} V` : "-- V",
    I: data.current != null ? `${data.current.toFixed(1)} A` : "-- A",
    P: data.power != null ? `${data.power.toFixed(1)} kW` : "-- kW",
    E: data.energy != null ? `${data.energy.toFixed(1)} kWh` : "-- kWh",
  };

  const btnY = lcdY + lcdH + step * 0.17;
  const btnW = step * 1.2;
  const btnH = step * 0.45;
  const btnGap = step * 0.2;
  const totalBtnW = 2 * btnW + btnGap;
  const btnStartX = x + (w - totalBtnW) / 2;

  return (
    <pixiContainer>
      <pixiGraphics draw={drawBody} />
      <pixiGraphics draw={drawLCD} />

      <pixiGraphics
        draw={(g: GraphicsType) => {
          g.clear();
          const boxW = w * 0.7;
          const boxH = step * 0.35;
          drawLabelBox(g, x + (w - boxW) / 2, y + step * 0.08, boxW, boxH, COLOR.borderStroke, 0.5, step);
        }}
      />
      <pixiText
        text={label}
        x={x + w / 2} y={y + step * 0.08 + step * 0.175} anchor={0.5}
        style={{ fontSize: titleFs, fill: COLOR.textLight, fontFamily: "monospace", fontWeight: "bold" }}
      />

      {ROW_LABELS.map((row, ri) => {
        const ry = lcdY + ri * rowHeight;
        const labelX = lcdX + step * 0.15;
        const valueX = lcdX + step * 0.55;
        const valText = values[row.label]!;
        const valColor = row.label === "V" ? COLOR.textVoltage
          : row.label === "I" ? COLOR.warningGlow
          : row.label === "P" ? COLOR.warning
          : COLOR.success;
        return (
          <pixiContainer key={row.label}>
            <pixiGraphics
              draw={(g: GraphicsType) => {
                g.clear();
                drawLabelBox(g, labelX - step * 0.05, ry + rowHeight * 0.2, step * 0.5, step * 0.3, valColor, 0.3, step);
              }}
            />
            <pixiText
              text={row.label}
              x={labelX + step * 0.2} y={ry + rowHeight * 0.35} anchor={0.5}
              style={{ fontSize: labelFs, fill: valColor, fontFamily: "monospace", fontWeight: "bold" }}
            />
            <pixiText
              text={valText}
              x={valueX} y={ry + rowHeight * 0.35} anchor={0}
              style={{ fontSize: valueFs, fill: COLOR.textNearWhite, fontFamily: "monospace" }}
            />
          </pixiContainer>
        );
      })}

      {["SIFIRLA", "TALEP"].map((label, bi) => {
        const bx = btnStartX + bi * (btnW + btnGap);
        return (
          <pixiContainer key={label}>
            <pixiGraphics
              draw={(g: GraphicsType) => {
                g.clear();
                g.roundRect(bx, btnY, btnW, btnH, step * 0.1);
                g.fill({ color: COLOR.bgSystemBar, alpha: 0.9 });
                g.stroke({ width: Math.max(0.5, step * 0.02), color: COLOR.borderStroke, alpha: 0.4 });
              }}
            />
            <pixiText
              text={label}
              x={bx + btnW / 2} y={btnY + btnH / 2} anchor={0.5}
              style={{ fontSize: btnFs, fill: COLOR.textMuted, fontFamily: "monospace", fontWeight: "bold" }}
            />
          </pixiContainer>
        );
      })}
    </pixiContainer>
  );
};

EnergyAnalyzerGraphic.displayName = "EnergyAnalyzerGraphic";
