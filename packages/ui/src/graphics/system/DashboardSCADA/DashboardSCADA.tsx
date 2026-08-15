import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import { SpriteTextureProvider } from "../../../core/SpriteTextureProvider";
import { SPRITE_ASSETS } from "../../textures";

import type { DashboardSCADAProps, SCADAStepConfig } from "./DashboardSCADA.types";
import { calculateSCADAConfig } from "./DashboardSCADA.utils";
import { useWebGLDetect, usePixiResize } from "../../deprecated/BSCGraphic/BSCGraphic.hooks";
import { usePixiZoom } from "../../../hooks/usePixiZoom";
import { COLOR } from "../../../colors";

import { RackCell, CircuitBreaker, DCOutput, RoomCard, HvacUnit, PanelCard } from "../../elements";
import type { RackCellConfig } from "../../elements/RackCell/RackCell.types";

extend({ Container, Graphics, Text, Sprite });

const RACK_COUNT = 8;

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
  summaryY: number;
}

function calcBSCPositions(config: SCADAStepConfig, bscIndex: number): BSCPositions {
  const { step, rackWidth, rackHeight, rackGap, outputRadius, bscStartX, cbLength, summaryHeight } = config;
  const bscBaseY = config.bscStartY + bscIndex * (rackHeight + step * 1.0 + summaryHeight + step * 0.5);
  const topBusY = bscBaseY - 0.3 * step;
  const bottomBusY = bscBaseY + rackHeight + 0.3 * step;
  const centerY = bscBaseY + rackHeight / 2;
  const rackXs: number[] = [];
  let cx = bscStartX;
  for (let i = 0; i < RACK_COUNT; i++) { rackXs.push(cx); cx += rackWidth + rackGap; }
  const lastRackRight = rackXs[rackXs.length - 1]! + rackWidth;
  const convergenceX = lastRackRight + 0.5 * step;
  const cbStartX = convergenceX + 0.3 * step;
  const cbEndX = cbStartX + cbLength;
  const dcX = cbEndX + outputRadius;
  const summaryY = bscBaseY + rackHeight + step * 0.3;
  return { rackXs, topBusY, bottomBusY, centerY, convergenceX, cbStartX, cbEndX, dcX, dcY: centerY, summaryY };
}

export const DashboardSCADA: React.FC<DashboardSCADAProps> = React.memo(function DashboardSCADA({
  bscUnits, flowDirection, hvacRooms, panelTemp, panelHumidity,
  energyFrequency, energyTotalPower, energyDelivered,
  fireAlarmActive, fireFaultActive,
  width = "100%",
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const handleAppRef = useCallback((app: any) => {
    if (appRef.current && app !== appRef.current) { try { appRef.current.destroy(true, true); } catch (_) {} appRef.current = null; }
    if (app) appRef.current = app;
  }, []);

  const [config, setConfig] = useState<SCADAStepConfig | null>(null);
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
    setConfig(calculateSCADAConfig(dimensions.width, bscUnits.length, hvacRooms.length));
  }, [dimensions, bscUnits.length, hvacRooms.length]);

  const combinedOnInit = useCallback((app: any) => { onInit(app); zoom.onAppInit(app); }, [onInit, zoom.onAppInit]);

  const bscPositions = useMemo(() => { if (!config) return []; return bscUnits.map((_, i) => calcBSCPositions(config, i)); }, [config, bscUnits]);
  const rackCellConfig: RackCellConfig | null = config ? { step: config.step, rackWidth: config.rackWidth, rackHeight: config.rackHeight } : null;

  if (!config || !rackCellConfig) {
    return <div ref={containerRef} style={{ width: "100%", height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>Yükleniyor...</div>;
  }

  const w = dimensions.width;
  const h = config.totalHeight;
  const s = config.step;
  const sf = Math.max(7, s * 0.17);
  const nf = Math.max(9, s * 0.2);
  const lf = Math.max(11, s * 0.28);
  const hf = Math.max(13, s * 0.36);
  const flowColor = flowDirection === "Charge" ? COLOR.success : flowDirection === "Discharge" ? COLOR.warning : COLOR.idle;
  const statusLabel = flowDirection === "Charge" ? "CHARGE" : flowDirection === "Discharge" ? "DISCHARGE" : "IDLE";
  const now = new Date().toLocaleTimeString();

  return (
    <div
      ref={containerRef}
      style={{ width: typeof width === "number" ? `${width}px` : width, height: h, cursor: zoomEnabled ? "zoom-in" : "default", overflow: "hidden" }}
      onMouseEnter={zoom.onMouseEnter} onMouseMove={zoom.onMouseMove} onMouseLeave={zoom.onMouseLeave}
    >
      <Application key={redrawKey + resizeKey} ref={handleAppRef} {...webglOverride} onInit={combinedOnInit}
        width={w} height={h} background={COLOR.bgCard} antialias resolution={window.devicePixelRatio || 1}>
        <SpriteTextureProvider assets={SPRITE_ASSETS}>
        <pixiContainer>

          {/* ── Top Bar: Status + EA + Fire ── */}
          <pixiGraphics
            draw={(g) => { g.clear(); g.roundRect(s * 0.5, s * 0.3, w - s, s * 1.6, s * 0.2); g.fill({ color: COLOR.gradScreen, alpha: 0.4 }); g.stroke({ width: Math.max(0.4, s * 0.015), color: COLOR.borderStroke, alpha: 0.4 }); }}
          />
          <pixiText text={`SCADA  ═══  ${statusLabel}`} x={s * 0.9} y={s * 0.6} anchor={0}
            style={{ fontSize: hf, fill: flowColor, fontFamily: "monospace", fontWeight: "bold" }} />
          <pixiGraphics
            draw={(g) => { g.clear(); const ex = s * 6.5; const ey = s * 0.55; g.roundRect(ex, ey, s * 2.8, s * 0.95, s * 0.15); g.fill({ color: COLOR.gradScreen, alpha: 0.6 }); g.stroke({ width: Math.max(0.3, s * 0.012), color: COLOR.borderStroke, alpha: 0.5 }); }}
          />
          <pixiText text={`⚡ EA`} x={s * 6.8} y={s * 0.7} anchor={0}
            style={{ fontSize: sf + 1, fill: COLOR.info, fontFamily: "monospace", fontWeight: "bold" }} />
          <pixiText text={energyFrequency != null ? `${energyFrequency.toFixed(1)} Hz` : "-- Hz"}
            x={s * 8.2} y={s * 0.7} anchor={0}
            style={{ fontSize: sf, fill: COLOR.textPrimary, fontFamily: "monospace" }} />
          <pixiText text={energyTotalPower != null ? `${energyTotalPower.toFixed(1)} kW` : "-- kW"}
            x={s * 8.2} y={s * 1.0} anchor={0}
            style={{ fontSize: sf, fill: COLOR.warning, fontFamily: "monospace" }} />
          <pixiText text={energyDelivered != null ? `${energyDelivered.toFixed(1)} kWh` : "-- kWh"}
            x={s * 8.2} y={s * 1.3} anchor={0}
            style={{ fontSize: sf - 1, fill: COLOR.textMuted, fontFamily: "monospace" }} />

          <pixiGraphics
            draw={(g) => { g.clear(); const fx = s * 11.5; const fy = s * 0.55; g.roundRect(fx, fy, s * 2.2, s * 0.95, s * 0.15); g.fill({ color: COLOR.gradScreen, alpha: 0.6 }); g.stroke({ width: Math.max(0.3, s * 0.012), color: fireAlarmActive ? COLOR.error : fireFaultActive ? COLOR.warning : COLOR.borderStroke, alpha: 0.6 }); }}
          />
          <pixiText text={"🔥 PANEL"} x={s * 11.8} y={s * 0.7} anchor={0}
            style={{ fontSize: sf + 1, fill: fireAlarmActive ? COLOR.error : fireFaultActive ? COLOR.warning : COLOR.textMuted, fontFamily: "monospace", fontWeight: "bold" }} />
          <pixiText text={fireAlarmActive ? "YANGIN!" : fireFaultActive ? "ARIZA" : "NORMAL"}
            x={s * 13.2} y={s * 0.7} anchor={0}
            style={{ fontSize: sf, fill: fireAlarmActive ? COLOR.error : fireFaultActive ? COLOR.warning : COLOR.success, fontFamily: "monospace", fontWeight: "bold" }} />

          {/* Flow direction arrow */}
          <pixiText text={flowDirection === "Charge" ? "▶" : "◀"} x={w - s * 1.2} y={s * 0.6} anchor={0}
            style={{ fontSize: lf, fill: flowColor, fontFamily: "monospace" }} />

          {/* ── BSC Section ── */}
          {bscUnits.map((unit, bIdx) => {
            const pos = bscPositions[bIdx]!;
            const su = unit.systemSummary;
            return (
              <pixiContainer key={`bsc-${bIdx}`}>
                <pixiGraphics draw={(g) => {
                  g.clear();
                  g.moveTo(pos.rackXs[0]! - s * 0.2, pos.topBusY);
                  g.lineTo(pos.convergenceX, pos.topBusY);
                  g.stroke({ width: Math.max(1.2, s * 0.04), color: COLOR.success, alpha: 0.5 });
                  g.moveTo(pos.rackXs[0]! - s * 0.2, pos.bottomBusY);
                  g.lineTo(pos.convergenceX, pos.bottomBusY);
                  g.stroke({ width: Math.max(1.2, s * 0.04), color: COLOR.warning, alpha: 0.5 });
                }} />
                <pixiText text="+" x={pos.rackXs[0]! - s * 0.25} y={pos.topBusY} anchor={0.5}
                  style={{ fontSize: Math.max(10, s * 0.3), fill: COLOR.success, fontFamily: "monospace", fontWeight: "bold" }} />
                <pixiText text="-" x={pos.rackXs[0]! - s * 0.25} y={pos.bottomBusY} anchor={0.5}
                  style={{ fontSize: Math.max(10, s * 0.3), fill: COLOR.warning, fontFamily: "monospace", fontWeight: "bold" }} />
                {unit.racks.map((rack, ri) => (
                  <RackCell key={ri} rack={rack} x={pos.rackXs[ri]!}
                    y={config.bscStartY + bIdx * (config.rackHeight + s * 1.0 + config.summaryHeight + s * 0.5)}
                    config={rackCellConfig!} flowDirection={flowDirection} />
                ))}
                <CircuitBreaker config={{ step: s }}
                  positions={{ racks: pos.rackXs.map((x, i) => ({ id: i + 1, x, y: 0 })), topBusY: pos.topBusY, bottomBusY: pos.bottomBusY, convergence: { x: pos.convergenceX, topY: pos.topBusY, bottomY: pos.bottomBusY }, circuitBreaker: { startX: pos.cbStartX, endX: pos.cbEndX, y: pos.centerY, gapSize: s * 0.22 }, output: { x: pos.dcX, y: pos.centerY, radius: config.outputRadius } }}
                  breakerStatus={unit.breakerStatus} breakerPosition={unit.breakerPosition} />
                <DCOutput config={{ step: s }} output={{ x: pos.dcX, y: pos.centerY, radius: config.outputRadius }} dcOutput={unit.dcOutput} />
                {su && (
                  <pixiContainer>
                    <pixiGraphics draw={(g) => {
                      g.clear(); g.roundRect(pos.rackXs[0]!, pos.summaryY, pos.dcX - pos.rackXs[0]! + config.outputRadius + s, config.summaryHeight, s * 0.15);
                      g.fill({ color: COLOR.gradScreen, alpha: 0.4 }); g.stroke({ width: Math.max(0.3, s * 0.012), color: COLOR.borderStroke, alpha: 0.25 });
                    }} />
                    <pixiText text={`${unit.deviceId}  SoC:${su.avgSoC.toFixed(1)}%  SoH:${su.avgSoH.toFixed(1)}%  ⚡${Math.abs(su.avgPower).toFixed(1)}kW  ${su.avgVoltage.toFixed(1)}V  ${su.avgCurrent.toFixed(1)}A  📦${su.onlineRackCount}/${su.totalRackCount}`}
                      x={pos.rackXs[0]! + s * 0.4} y={pos.summaryY + s * 0.55} anchor={0}
                      style={{ fontSize: sf, fill: COLOR.textPrimary, fontFamily: "monospace" }} />
                    <pixiGraphics draw={(g) => {
                      const bx = pos.rackXs[0]! + s * 0.4; const by = pos.summaryY + s * 1.2; const bw = (pos.dcX - pos.rackXs[0]! + config.outputRadius - s * 1.0) * 0.45;
                      g.clear(); g.roundRect(bx, by, bw, s * 0.25, s * 0.05); g.fill({ color: COLOR.borderDefault, alpha: 0.5 });
                      g.roundRect(bx, by, bw * Math.min(1, su.avgSoC / 100), s * 0.25, s * 0.05); g.fill({ color: COLOR.success });
                    }} />
                    <pixiGraphics draw={(g) => {
                      const bw = (pos.dcX - pos.rackXs[0]! + config.outputRadius - s * 1.0) * 0.45;
                      const bx = pos.rackXs[0]! + s * 0.4 + bw + s * 0.4; const by = pos.summaryY + s * 1.2;
                      g.clear(); g.roundRect(bx, by, bw, s * 0.25, s * 0.05); g.fill({ color: COLOR.borderDefault, alpha: 0.5 });
                      g.roundRect(bx, by, bw * Math.min(1, su.avgSoH / 100), s * 0.25, s * 0.05); g.fill({ color: COLOR.info });
                    }} />
                    <pixiText text={"SoC"} x={pos.rackXs[0]! + s * 0.4} y={pos.summaryY + s * 2.0} anchor={0}
                      style={{ fontSize: sf - 2, fill: COLOR.textMuted, fontFamily: "monospace" }} />
                    <pixiText text={"SoH"} x={pos.rackXs[0]! + s * 0.4 + (pos.dcX - pos.rackXs[0]! + config.outputRadius - s * 1.0) * 0.55} y={pos.summaryY + s * 2.0} anchor={0}
                      style={{ fontSize: sf - 2, fill: COLOR.textMuted, fontFamily: "monospace" }} />
                  </pixiContainer>
                )}
              </pixiContainer>
            );
          })}

          {/* ── HVAC Section ── */}
          {hvacRooms.length > 0 && (
            <pixiContainer>
              <pixiGraphics draw={(g) => { g.clear(); g.moveTo(s * 0.5, config.hvacStartY - s * 0.3); g.lineTo(w - s * 0.5, config.hvacStartY - s * 0.3); g.stroke({ width: 1, color: COLOR.borderStroke, alpha: 0.3 }); }} />
              <pixiText text={"HVAC SİSTEMİ"} x={w / 2} y={config.hvacStartY - s * 0.1} anchor={0.5}
                style={{ fontSize: sf, fill: COLOR.textMuted, fontFamily: "monospace" }} />
              {hvacRooms.map((room, ri) => {
                const rx = config.bscStartX + ri * config.roomWidth;
                const rw = config.roomWidth; const rh = config.roomHeight; const ry = config.hvacStartY;
                const hvacAreaH = rh * 0.35; const hvacY = ry + rh - hvacAreaH - s * 0.15;
                const hvacGap = s * 0.4; const hvacPad = s * 0.6; const hvw = (rw - hvacPad * 2 - hvacGap) / 2;
                return (
                  <pixiContainer key={`room-${ri}`}>
                    <RoomCard room={{ temp: room.temp, humidity: room.humidity, setTemp: room.setTemp }}
                      roomPos={{ index: ri, x: rx, y: ry, width: rw, height: rh, hvac1: { x: rx + hvacPad, y: hvacY, width: hvw, height: hvacAreaH }, hvac2: { x: rx + hvacPad + hvw + hvacGap, y: hvacY, width: hvw, height: hvacAreaH } }}
                      config={{ step: s }} />
                    <HvacUnit hvac={room.hvacs[0]} pos={{ x: rx + hvacPad, y: hvacY, width: hvw, height: hvacAreaH }} config={{ step: s }} />
                    {room.hvacs[1] && <HvacUnit hvac={room.hvacs[1]!} pos={{ x: rx + hvacPad + hvw + hvacGap, y: hvacY, width: hvw, height: hvacAreaH }} config={{ step: s }} />}
                  </pixiContainer>
                );
              })}
              <PanelCard pos={{ x: config.bscStartX + hvacRooms.length * config.roomWidth + config.panelGap, y: config.hvacStartY, width: config.panelWidth, height: config.roomHeight }}
                panelTemp={panelTemp} panelHumidity={panelHumidity} config={{ step: s }} />
            </pixiContainer>
          )}

          {/* ── Terminal Section ── */}
          <pixiContainer>
            <pixiGraphics draw={(g) => {
              g.clear();
              const tx = s * 0.5; const ty = config.terminalStartY; const tw = w - s; const th = config.terminalHeight;
              g.roundRect(tx, ty, tw, th, s * 0.15);
              g.fill({ color: COLOR.bgCodeDark, alpha: 0.9 });
              g.stroke({ width: Math.max(0.5, s * 0.015), color: COLOR.borderStroke, alpha: 0.4 });
            }} />
            <pixiText text={"╔══════════════ SİSTEM TERMİNALİ ══════════════╗"} x={w / 2} y={config.terminalStartY + s * 0.5} anchor={0.5}
              style={{ fontSize: sf, fill: COLOR.textMuted, fontFamily: "monospace", fontWeight: "bold" }} />
            <pixiText text={`║ [${now}] SCADA aktif — ${bscUnits.length} BSC, ${hvacRooms.length} oda, flow: ${statusLabel.toLowerCase()} ║`}
              x={s * 1.0} y={config.terminalStartY + s * 1.4} anchor={0}
              style={{ fontSize: Math.max(8, s * 0.13), fill: COLOR.success, fontFamily: "monospace" }} />
            <pixiText text={`║ SoC ort: ${bscUnits.length > 0 && bscUnits[0]!.systemSummary ? bscUnits[0]!.systemSummary.avgSoC.toFixed(1) : "--"}%  Güç: ${bscUnits.length > 0 && bscUnits[0]!.systemSummary ? Math.abs(bscUnits[0]!.systemSummary.avgPower).toFixed(1) : "--"} kW ║`}
              x={s * 1.0} y={config.terminalStartY + s * 2.2} anchor={0}
              style={{ fontSize: Math.max(8, s * 0.13), fill: COLOR.textPurple, fontFamily: "monospace" }} />
            <pixiText text={"║ ▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂▂ ║"}
              x={s * 1.0} y={config.terminalStartY + config.terminalHeight - s * 0.8} anchor={0}
              style={{ fontSize: Math.max(6, s * 0.09), fill: COLOR.textDisabled, fontFamily: "monospace" }} />
          </pixiContainer>

        </pixiContainer>
        </SpriteTextureProvider>
      </Application>
    </div>
  );
});

DashboardSCADA.displayName = "DashboardSCADA";
