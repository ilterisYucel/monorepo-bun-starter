import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { SpriteTextureProvider } from "../../../core/SpriteTextureProvider";
import { SPRITE_ASSETS } from "../../textures";

import type { BESSDiagramProps, BESSConfig } from "./BESSDiagram.types";
import { calculateBESSConfig, getBSCLayout } from "./BESSDiagram.utils";
import { drawContainerFrame } from "./BESSDiagram.drawers";
import { useWebGLDetect, usePixiResize } from "../../deprecated/BSCGraphic/BSCGraphic.hooks";
import { usePixiZoom } from "../../../hooks/usePixiZoom";
import { COLOR } from "../../../colors";

import { RoomCard, HvacUnit, PanelCard, FirePanel, EnergyAnalyzerGraphic, GridSymbol, Cable } from "../../elements";
import { BSCUnitRow } from "../shared/BSCUnitRow";

extend({ Container, Graphics, Text, Sprite });

const RACK_COUNT = 8;
const PAD = 2;

interface BSCPositions {
  rackXs: number[];
  topBusY: number;
  bottomBusY: number;
  centerY: number;
  convergenceX: number;
  cbStartX: number;
  cbEndX: number;
  dcX: number;
  dcY: number;
}

function calcBSCPositions(config: BESSConfig, layout: ReturnType<typeof getBSCLayout>): BSCPositions {
  const { step, rackWidth, rackHeight, rackGap, cbLength, dcRadius } = config;
  const { startX, startY } = layout;

  const topBusY = startY - step * 0.4;
  const bottomBusY = startY + rackHeight + step * 0.4;
  const centerY = startY + rackHeight / 2;

  const rackXs: number[] = [];
  let cx = startX;
  for (let i = 0; i < RACK_COUNT; i++) { rackXs.push(cx); cx += rackWidth + rackGap; }

  const lastRackRight = rackXs[rackXs.length - 1]! + rackWidth;
  const convergenceX = lastRackRight + step * 0.4;
  const cbStartX = convergenceX + step * 0.25;
  const cbEndX = cbStartX + cbLength;
  const dcX = cbEndX + dcRadius;

  return { rackXs, topBusY, bottomBusY, centerY, convergenceX, cbStartX, cbEndX, dcX, dcY: centerY };
}

export const BESSDiagram: React.FC<BESSDiagramProps> = React.memo(function BESSDiagram({
  bscUnits, flowDirection, hvacRooms, panelTemp, panelHumidity,
  energyAnalyzer, firePanel,
  width = "100%", height = 1200,
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const handleAppRef = useCallback((app: any) => {
    if (appRef.current && app !== appRef.current) { try { appRef.current.destroy(true, true); } catch (_) {} appRef.current = null; }
    if (app) appRef.current = app;
  }, []);

  const [config, setConfig] = useState<BESSConfig | null>(null);
  const [redrawKey, setRedrawKey] = useState(0);
  const [zoomEnabled, setZoomEnabled] = useState(false);

  const { dimensions, resizeKey } = usePixiResize(containerRef, width);
  const webglOverride = useWebGLDetect();
  const zoom = usePixiZoom({ enabled: zoomEnabled });

  const timestampRef = useRef(0);
  const onInit = useCallback((app: any) => {
    app.ticker.add((ticker: { deltaMS: number }) => { timestampRef.current += ticker.deltaMS; });
  }, []);

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
  useEffect(() => { return () => { if (appRef.current) { try { appRef.current.destroy(true, true); } catch (_) {} } }; }, []);

  useEffect(() => {
    if (!isMountedRef.current) return;
    const h = typeof height === "number" ? height : 800;
    setConfig(calculateBESSConfig(dimensions.width, h, bscUnits.length, hvacRooms.length));
  }, [dimensions, bscUnits.length, hvacRooms.length, height]);

  const combinedOnInit = useCallback((app: any) => {
    onInit(app);
    try { zoom.onAppInit(app); } catch (_) {}
  }, [onInit, zoom.onAppInit]);

  const bscLayouts = useMemo(() => {
    if (!config) return [];
    return bscUnits.map((_, i) => getBSCLayout(config, i));
  }, [config, bscUnits]);

  const bscPositions = useMemo(() => {
    if (!config) return [];
    return bscLayouts.map((layout) => calcBSCPositions(config, layout));
  }, [config, bscLayouts]);

  if (!config) {
    return (
      <div ref={containerRef} style={{ width: "100%", height: typeof height === "number" ? height : 1200, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
        Yukleniyor...
      </div>
    );
  }

  const w = dimensions.width;
  const h = config.totalHeight;
  const s = config.step;
  const hs = config.hStep;
  const sf = Math.max(7, s * 0.17);

  const flowColor = flowDirection === "Charge" ? COLOR.success : flowDirection === "Discharge" ? COLOR.warning : COLOR.idle;
  const flowLabel = flowDirection === "Charge" ? "CHARGE" : flowDirection === "Discharge" ? "DISCHARGE" : "IDLE";
  const fpStatus = firePanel.fire ? "YANGIN!" : firePanel.fault ? "ARIZA" : "NORMAL";
  const fpColor = firePanel.fire ? COLOR.error : firePanel.fault ? COLOR.warning : COLOR.success;

  const dcTopY = bscPositions.length > 0 ? Math.min(...bscPositions.map(p => p.dcY)) : config.bscStartY + config.rackHeight / 2;
  const dcBottomY = bscPositions.length > 0 ? Math.max(...bscPositions.map(p => p.dcY)) : dcTopY;

  // Top row: 4 cards side by side, no gaps
  const topY = PAD + s * 0.2;
  const topH = config.summaryBarHeight;
  const bscW = (w - config.bscStartX - config.topCardFlowW - config.topCardEaW - config.topCardFireW) / bscUnits.length;
  const barW = bscW * 0.18;

  // Card X positions (touching each other)
  const flowX = config.bscStartX;
  const bsc1X = flowX + config.topCardFlowW;
  const bsc2X = bsc1X + bscW;
  const eaCardX = bsc2X + (bscUnits.length > 1 ? bscW : 0);
  const fireCardX = eaCardX + config.topCardEaW;

  return (
    <div
      ref={containerRef}
      style={{ width: typeof width === "number" ? `${width}px` : width, height: h, cursor: zoomEnabled ? "zoom-in" : "default", overflow: "hidden" }}
      onMouseEnter={zoom.onMouseEnter} onMouseMove={zoom.onMouseMove} onMouseLeave={zoom.onMouseLeave}
    >
      <Application key={redrawKey + resizeKey} ref={handleAppRef} {...webglOverride} onInit={combinedOnInit}
        width={w} height={h} background={COLOR.bgApp} antialias resolution={window.devicePixelRatio || 1}>
        <SpriteTextureProvider assets={SPRITE_ASSETS}>
        <pixiContainer>

          <pixiGraphics
            draw={(g) => { g.clear(); drawContainerFrame(g, w, h, 2, s); }}
          />

          {/* ════════════ TOP BAR (tek parça) ════════════ */}
          <pixiGraphics
            draw={(g) => {
              g.clear();
              const totalW = fireCardX + config.topCardFireW - flowX;
              g.roundRect(flowX, topY, totalW, topH, s * 0.1);
              g.fill({ color: COLOR.gradScreen, alpha: 0.45 });
              g.stroke({ width: Math.max(0.3, s * 0.012), color: COLOR.borderStroke, alpha: 0.25 });
            }}
          />

          {/* Flow indicator > */}
          <pixiGraphics
            draw={(g) => {
              g.clear();
              const dotR = Math.max(4, s * 0.14);
              g.circle(flowX + config.topCardFlowW / 2, topY + topH * 0.35, dotR);
              g.fill({ color: flowColor, alpha: 0.9 });
              g.stroke({ width: Math.max(0.5, s * 0.015), color: flowColor, alpha: 0.4 });
            }}
          />
          <pixiText
            text={flowLabel}
            x={flowX + config.topCardFlowW / 2} y={topY + topH * 0.72} anchor={0.5}
            style={{ fontSize: Math.max(7, s * 0.18), fill: flowColor, fontFamily: "monospace", fontWeight: "bold" }}
          />

          {/* BSC summaries */}
          {bscUnits.map((unit, bIdx) => {
            const su = unit.systemSummary;
            if (!su) return null;
            const cx = bIdx === 0 ? bsc1X : bsc2X;

            return (
              <pixiContainer key={`summary-${bIdx}`}>
                <pixiText
                  text={`${unit.deviceId}  SoC:${su.avgSoC.toFixed(1)}%  SoH:${su.avgSoH.toFixed(1)}%  ${Math.abs(su.avgPower).toFixed(1)}kW  ${su.avgVoltage.toFixed(1)}V  ${su.avgCurrent.toFixed(1)}A  📦${su.onlineRackCount}/${su.totalRackCount}`}
                  x={cx + s * 0.3} y={topY + s * 0.42} anchor={0}
                  style={{ fontSize: sf, fill: COLOR.textPrimary, fontFamily: "monospace" }}
                />
                <pixiGraphics
                  draw={(g) => {
                    g.clear();
                    const bx = cx + s * 0.3;
                    const by = topY + s * 0.95;
                    const bh = s * 0.2;
                    g.roundRect(bx, by, barW, bh, s * 0.04);
                    g.fill({ color: COLOR.borderDefault, alpha: 0.5 });
                    g.roundRect(bx, by, barW * Math.min(1, su.avgSoC / 100), bh, s * 0.04);
                    g.fill({ color: COLOR.success });
                  }}
                />
                <pixiText
                  text={"SoC"}
                  x={cx + s * 0.3} y={topY + s * 1.4} anchor={0}
                  style={{ fontSize: sf - 2, fill: COLOR.textMuted, fontFamily: "monospace" }}
                />
                <pixiGraphics
                  draw={(g) => {
                    g.clear();
                    const bx = cx + s * 0.3 + barW + s * 0.2;
                    const by = topY + s * 0.95;
                    const bh = s * 0.2;
                    g.roundRect(bx, by, barW, bh, s * 0.04);
                    g.fill({ color: COLOR.borderDefault, alpha: 0.5 });
                    g.roundRect(bx, by, barW * Math.min(1, su.avgSoH / 100), bh, s * 0.04);
                    g.fill({ color: COLOR.info });
                  }}
                />
                <pixiText
                  text={"SoH"}
                  x={cx + s * 0.3 + barW + s * 0.2} y={topY + s * 1.4} anchor={0}
                  style={{ fontSize: sf - 2, fill: COLOR.textMuted, fontFamily: "monospace" }}
                />
              </pixiContainer>
            );
          })}

          {/* EA compact summary */}
          <pixiText
            text={"DC ANALIZOR"}
            x={eaCardX + config.topCardEaW / 2} y={topY + s * 0.28} anchor={0.5}
            style={{ fontSize: Math.max(6, s * 0.15), fill: COLOR.info, fontFamily: "monospace", fontWeight: "bold" }}
          />
          <pixiText
            text={energyAnalyzer.voltage != null ? `${energyAnalyzer.voltage.toFixed(0)}V` : "--V"}
            x={eaCardX + s * 0.3} y={topY + s * 0.58} anchor={0}
            style={{ fontSize: Math.max(6, s * 0.14), fill: COLOR.textVoltage, fontFamily: "monospace" }}
          />
          <pixiText
            text={energyAnalyzer.current != null ? `${energyAnalyzer.current.toFixed(0)}A` : "--A"}
            x={eaCardX + s * 0.3} y={topY + s * 0.85} anchor={0}
            style={{ fontSize: Math.max(6, s * 0.14), fill: COLOR.warningGlow, fontFamily: "monospace" }}
          />
          <pixiText
            text={energyAnalyzer.power != null ? `${energyAnalyzer.power.toFixed(1)}kW` : "--kW"}
            x={eaCardX + config.topCardEaW / 2 + s * 0.1} y={topY + s * 0.58} anchor={0}
            style={{ fontSize: Math.max(6, s * 0.14), fill: COLOR.warning, fontFamily: "monospace" }}
          />
          <pixiText
            text={energyAnalyzer.energy != null ? `${energyAnalyzer.energy.toFixed(0)}kWh` : "--kWh"}
            x={eaCardX + config.topCardEaW / 2 + s * 0.1} y={topY + s * 0.85} anchor={0}
            style={{ fontSize: Math.max(6, s * 0.14), fill: COLOR.textPrimary, fontFamily: "monospace" }}
          />

          {/* Fire status */}
          <pixiText
            text={"YANGIN"}
            x={fireCardX + config.topCardFireW / 2} y={topY + s * 0.32} anchor={0.5}
            style={{ fontSize: Math.max(6, s * 0.16), fill: fpColor, fontFamily: "monospace", fontWeight: "bold" }}
          />
          <pixiText
            text={fpStatus}
            x={fireCardX + config.topCardFireW / 2} y={topY + s * 0.72} anchor={0.5}
            style={{ fontSize: Math.max(7, s * 0.2), fill: fpColor, fontFamily: "monospace", fontWeight: "bold" }}
          />
          <pixiText
            text={firePanel.fire ? "🔥 AKTIF" : firePanel.fault ? "⚠ ARIZA" : "✓ OK"}
            x={fireCardX + config.topCardFireW / 2} y={topY + s * 1.2} anchor={0.5}
            style={{ fontSize: Math.max(6, s * 0.14), fill: fpColor, fontFamily: "monospace" }}
          />

          {/* ════════════ BSC SECTION ════════════ */}
          {bscUnits.map((unit, bIdx) => {
            const pos = bscPositions[bIdx]!;
            const layout = bscLayouts[bIdx]!;

            return (
              <pixiContainer key={`bsc-${bIdx}`}>
                <pixiText
                  text={"+"} x={pos.rackXs[0]! + 4} y={pos.topBusY} anchor={0.5}
                  style={{ fontSize: Math.max(9, s * 0.28), fill: COLOR.success, fontFamily: "monospace", fontWeight: "bold" }}
                />
                <pixiText
                  text={"-"} x={pos.rackXs[0]! + 4} y={pos.bottomBusY} anchor={0.5}
                  style={{ fontSize: Math.max(9, s * 0.28), fill: COLOR.warning, fontFamily: "monospace", fontWeight: "bold" }}
                />

                <BSCUnitRow
                  unit={{
                    deviceId: unit.deviceId,
                    racks: unit.racks,
                    breakerStatus: unit.breakerStatus,
                    breakerPosition: unit.breakerPosition,
                    dcOutput: unit.dcOutput,
                  }}
                  positions={{
                    rackXs: pos.rackXs,
                    rackY: layout.startY,
                    rackWidth: config.rackWidth,
                    rackHeight: config.rackHeight,
                    topBusY: pos.topBusY,
                    bottomBusY: pos.bottomBusY,
                    convergenceX: pos.convergenceX,
                    cbStartX: pos.cbStartX,
                    cbEndX: pos.cbEndX,
                    dcX: pos.dcX,
                    dcRadius: config.dcRadius,
                    centerY: pos.centerY,
                    step: s,
                  }}
                  flowDirection={flowDirection}
                  busEndX={config.rightBusX}
                />
              </pixiContainer>
            );
          })}

          {/* ════════════ SAĞ SÜTUN: BUS → EA → ŞEBEKE ════════════ */}
          <Cable
            path={[{ x: config.rightBusX, y: dcTopY }, { x: config.rightBusX, y: dcBottomY }]}
            flowDirection={flowDirection.toLowerCase() as "charge" | "discharge" | "idle"}
            step={s}
          />
          <Cable
            path={[{ x: config.rightBusX, y: config.eaY + config.eaHeight / 2 }, { x: config.eaStartX, y: config.eaY + config.eaHeight / 2 }]}
            flowDirection={flowDirection.toLowerCase() as "charge" | "discharge" | "idle"}
            step={s}
          />
          <Cable
            path={[{ x: config.eaStartX + config.eaWidth, y: config.eaY + config.eaHeight / 2 }, { x: config.gridStartX, y: config.gridY + config.gridHeight / 2 }]}
            flowDirection={flowDirection.toLowerCase() as "charge" | "discharge" | "idle"}
            step={s}
          />

          <EnergyAnalyzerGraphic
            data={energyAnalyzer}
            x={config.eaStartX} y={config.eaY}
            width={config.eaWidth} height={config.eaHeight}
            config={{ step: s }}
          />

          <GridSymbol
            x={config.gridStartX} y={config.gridY}
            width={config.gridWidth} height={config.gridHeight}
            config={{ step: s }}
          />
          <pixiGraphics
            draw={(g) => {
              g.clear();
              drawLabelBox(g, config.gridStartX, config.gridY - s * 0.4, config.gridWidth, s * 0.35, COLOR.infoLight, 0.4, s);
            }}
          />
          <pixiText
            text={"SEBEKE"}
            x={config.gridStartX + config.gridWidth / 2} y={config.gridY - s * 0.4 + s * 0.175} anchor={0.5}
            style={{ fontSize: Math.max(7, s * 0.17), fill: COLOR.info, fontFamily: "monospace", fontWeight: "bold" }}
          />

          {/* ════════════ HVAC + FIRE (TMS ölçeğinde) ════════════ */}
          {hvacRooms.length > 0 && (
            <pixiContainer>
              {hvacRooms.map((room, ri) => {
                const hs = config.hStep;
                const hStartX = hs * 0.5;
                const roomStartX = hStartX + ri * config.roomWidth;
                const ry = config.hvacStartY + hs * 0.8;
                const rh = config.roomHeight;
                const rw = config.roomWidth;
                const hvacAreaH = rh * 0.35;
                const hvacY = ry + rh - hvacAreaH - hs * 0.15;
                const hvacGap = hs * 0.4;
                const hvacPad = hs * 0.6;
                const hvw = (rw - hvacPad * 2 - hvacGap) / 2;

                return (
                  <pixiContainer key={`room-${ri}`}>
                    <RoomCard
                      room={{ temp: room.temp, humidity: room.humidity, setTemp: room.setTemp }}
                      roomPos={{
                        index: ri, x: roomStartX, y: ry, width: rw, height: rh,
                        hvac1: { x: roomStartX + hvacPad, y: hvacY, width: hvw, height: hvacAreaH },
                        hvac2: { x: roomStartX + hvacPad + hvw + hvacGap, y: hvacY, width: hvw, height: hvacAreaH },
                      }}
                      config={{ step: hs }}
                      minimal
                    />
                    <HvacUnit hvac={room.hvacs[0]} pos={{ x: roomStartX + hvacPad, y: hvacY, width: hvw, height: hvacAreaH }} config={{ step: hs }} minimal />
                    {room.hvacs[1] && (
                      <HvacUnit hvac={room.hvacs[1]!} pos={{ x: roomStartX + hvacPad + hvw + hvacGap, y: hvacY, width: hvw, height: hvacAreaH }} config={{ step: hs }} minimal />
                    )}
                  </pixiContainer>
                );
              })}

              <PanelCard
                pos={{
                  x: hs * 0.5 + hvacRooms.length * config.roomWidth + config.panelGap,
                  y: config.hvacStartY + hs * 0.8,
                  width: config.panelWidth,
                  height: config.roomHeight,
                }}
                panelTemp={panelTemp} panelHumidity={panelHumidity} config={{ step: hs }} minimal
              />

              <FirePanel
                data={firePanel}
                x={hs * 0.5 + hvacRooms.length * config.roomWidth + config.panelGap + config.panelWidth + hs * 0.6}
                y={config.hvacStartY + hs * 0.8}
                width={config.fireWidth}
                height={config.fireHeight}
                config={{ step: s }}
              />
            </pixiContainer>
          )}

        </pixiContainer>
        </SpriteTextureProvider>
      </Application>
    </div>
  );
});

BESSDiagram.displayName = "BESSDiagram";

function drawLabelBox(g: import("pixi.js").Graphics, x: number, y: number, boxW: number, boxH: number, borderColor: number, borderAlpha: number, step: number): void {
  g.roundRect(x, y, boxW, boxH, step * 0.05);
  g.fill({ color: COLOR.gradScreen, alpha: 0.85 });
  g.stroke({ width: Math.max(0.3, step * 0.012), color: borderColor, alpha: borderAlpha });
}
