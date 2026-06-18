import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";
import type { Graphics as GraphicsType } from "pixi.js";

import type { BSCGraphicProps, BSCUnit, BSCPositions, StepConfig } from "../BSCGraphic/BSCGraphic.types";
import { calculateStepConfig, getRackPositions } from "../BSCGraphic/BSCGraphic.utils";
import { useWebGLDetect, usePixiResize, usePixiTicker } from "../BSCGraphic/BSCGraphic.hooks";
import { drawFlowArrows } from "../BSCGraphic/BSCGraphic.drawers";
import { usePixiZoom } from "../../hooks/usePixiZoom";
import { SCADA_ICONS } from "../../icons";
import type { Rack } from "../../types";
import type { RackCellConfig } from "../../core/RackCell/RackCell.types";
import {
  RackCell,
  RackInfoPopover,
  CableBus,
  CircuitBreaker,
  DCOutput,
} from "../../core";

import * as S from "./BSCGraphicV2.styles";

extend({ Container, Graphics, Text, Sprite });

// ── BSCV2Canvas ──────────────────────────────────────────────────────────────

const BSCV2Canvas: React.FC<{
  unit: BSCUnit;
  flowDirection: "Charge" | "Discharge" | "Idle";
  onRackClick?: (rackId: number) => void;
  onBreakerToggle?: (position: "open" | "close") => void;
  refreshCounter?: number;
  zoomEnabled: boolean;
}> = React.memo(function BSCV2Canvas({
  unit,
  flowDirection,
  onRackClick,
  onBreakerToggle,
  refreshCounter,
  zoomEnabled,
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMountedRef = useRef(true);

  const [config, setConfig] = useState<StepConfig | null>(null);
  const [positions, setPositions] = useState<BSCPositions | null>(null);
  const [redrawKey, setRedrawKey] = useState(0);
  const [breakerStatus, setBreakerStatus] = useState(unit.breakerStatus ?? "online");
  const [breakerPosition, setBreakerPosition] = useState(unit.breakerPosition ?? "close");
  const [popoverData, setPopoverData] = useState<{ rack: Rack; x: number; y: number } | null>(null);

  const rackCellConfig: RackCellConfig | null = config
    ? { step: config.step, rackWidth: config.rackWidth, rackHeight: config.rackHeight }
    : null;

  const { dimensions, resizeKey } = usePixiResize(containerRef, "100%");
  const { timestampRef, frameCount, onInit } = usePixiTicker();
  const webglOverride = useWebGLDetect();

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    setBreakerStatus(unit.breakerStatus ?? "online");
    setBreakerPosition(unit.breakerPosition ?? "close");
  }, [unit.breakerStatus, unit.breakerPosition]);

  useEffect(() => {
    if (!isMountedRef.current) return;
    const c = calculateStepConfig(dimensions.width);
    setConfig(c);
    setPositions(getRackPositions(c));
  }, [dimensions]);

  useEffect(() => {
    return () => {
      if (appRef.current) {
        try { appRef.current.destroy(true, true); } catch (_) {}
        appRef.current = null;
      }
    };
  }, []);

  const handleBreakerClick = useCallback(() => {
    if (breakerStatus === "offline") return;
    const newPos = breakerPosition === "close" ? "open" : "close";
    setBreakerPosition(newPos);
    onBreakerToggle?.(newPos);
  }, [breakerStatus, breakerPosition, onBreakerToggle]);

  const zoom = usePixiZoom({ enabled: zoomEnabled });

  const combinedOnInit = useCallback(
    (app: any) => {
      onInit(app);
      zoom.onAppInit(app);
      canvasRef.current = app.canvas;
    },
    [onInit, zoom.onAppInit],
  );

  const drawFlows = useCallback(
    (g: GraphicsType) => {
      if (!config || !positions) return;
      drawFlowArrows(g, config, positions, flowDirection, breakerStatus, breakerPosition, unit.dcOutput, timestampRef);
    },
    [config, positions, flowDirection, breakerStatus, breakerPosition, unit.dcOutput, frameCount],
  );

  const labels = useMemo(() => {
    if (!config || !positions) return null;
    const { step, rackWidth } = config;
    const { racks: rackPositions, circuitBreaker: cb, convergence: cv, output, topBusY, bottomBusY } = positions;
    const fs = Math.max(9, step * 0.2);
    const smallFs = Math.max(7, step * 0.17);

    return (
      <>
        {/* Bus bar labels */}
        <pixiText key="bus-plus" text="+" x={rackPositions[0]!.x - step * 0.3} y={topBusY} anchor={0.5}
          style={{ fontSize: Math.max(15, step * 0.4), fill: 0x10b981, fontFamily: "monospace", fontWeight: "bold" }} />
        <pixiText key="bus-minus" text="-" x={rackPositions[0]!.x - step * 0.3} y={bottomBusY} anchor={0.5}
          style={{ fontSize: Math.max(15, step * 0.4), fill: 0xf59e0b, fontFamily: "monospace", fontWeight: "bold" }} />

        {/* Breaker labels */}
        {(() => {
          const cbCenterX = (cv.x + step * 0.2 + cb.endX) / 2;
          const cbCenterY = (topBusY + bottomBusY) / 2;
          const ly = cbCenterY + step * 0.6;
          return (
            <>
              <pixiText key="cb-label" text="CB" x={cbCenterX} y={ly} anchor={0.5}
                style={{ fontSize: smallFs + 4, fill: 0x9ca3af, fontFamily: "monospace", fontWeight: "bold" }} />
              <pixiText key="cb-status" text={breakerStatus === "online" ? "Online" : "Offline"} x={cbCenterX} y={ly + step * 0.5} anchor={0.5}
                style={{ fontSize: smallFs + 1, fill: breakerStatus === "online" ? 0x10b981 : 0xef4444, fontFamily: "monospace", fontWeight: "bold" }} />
              <pixiText key="cb-pos" text={breakerPosition === "close" ? "Closed" : "Open"} x={cbCenterX} y={ly + step} anchor={0.5}
                style={{ fontSize: smallFs + 1, fill: breakerPosition === "close" ? 0x10b981 : 0xf59e0b, fontFamily: "monospace", fontWeight: "bold" }} />
            </>
          );
        })()}

        {/* DC Output labels */}
        <pixiText key="out-label" text="DC" x={output.x} y={output.y - output.radius - step * 0.25} anchor={0.5}
          style={{ fontSize: fs, fill: 0xffffff, fontFamily: "monospace", fontWeight: "bold" }} />
        {unit.dcOutput && (
          <>
            <pixiText key="out-v" text={`${unit.dcOutput.voltage}V`} x={output.x} y={output.y + output.radius + step * 0.25} anchor={0.5}
              style={{ fontSize: smallFs + 3, fill: 0x9ca3af, fontFamily: "monospace" }} />
            <pixiText key="out-a" text={`${unit.dcOutput.current}A`} x={output.x} y={output.y + output.radius + step * 0.75} anchor={0.5}
              style={{ fontSize: smallFs + 3, fill: 0xf59e0b, fontFamily: "monospace", fontWeight: "bold" }} />
          </>
        )}
      </>
    );
  }, [config, positions, breakerStatus, breakerPosition, unit.dcOutput, redrawKey]);

  if (!config || !positions) {
    return (
      <S.CanvasWrap ref={containerRef}>
        <S.Loading>Yükleniyor...</S.Loading>
      </S.CanvasWrap>
    );
  }

  const headerFontSize = Math.max(13, config.step * 0.36);

  return (
    <S.CanvasWrap
      ref={containerRef}
      onMouseEnter={zoom.onMouseEnter}
      onMouseMove={zoom.onMouseMove}
      onMouseLeave={zoom.onMouseLeave}
    >
      <Application
        key={redrawKey + (refreshCounter ?? 0) + resizeKey}
        ref={appRef}
        {...webglOverride}
        onInit={combinedOnInit}
        width={dimensions.width}
        height={dimensions.height}
        background={0x1f1f2e}
        antialias
        resolution={window.devicePixelRatio || 1}
      >
        {/* Header */}
        <pixiText
          key="device-id"
          text={unit.deviceId}
          x={config.step * 0.8}
          y={config.step * 0.4}
          anchor={0.5}
          style={{ fontSize: headerFontSize, fill: 0xe5e7eb, fontFamily: "monospace", fontWeight: "bold" }}
        />

        {/* Static: cables */}
        <CableBus config={config} positions={positions} />

        {/* Rack cells */}
        {positions.racks.map((pos, i) => (
          <RackCell
            key={unit.racks[i]?.id ?? pos.id}
            rack={unit.racks[i]!}
            x={pos.x}
            y={pos.y}
            config={rackCellConfig!}
            flowDirection={flowDirection}
            frameCount={frameCount}
            timestampRef={timestampRef}
            onClick={(rack, position) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              setPopoverData({
                rack,
                x: position.x + (rect?.left ?? 0),
                y: position.y + (rect?.top ?? 0),
              });
              onRackClick?.(rack.id);
            }}
          />
        ))}

        {/* Breaker */}
        <CircuitBreaker
          config={config}
          positions={positions}
          breakerStatus={breakerStatus}
          breakerPosition={breakerPosition}
          timestampRef={timestampRef}
          frameCount={frameCount}
          onClick={handleBreakerClick}
        />

        {/* DC Output */}
        <DCOutput
          config={config}
          output={positions.output}
          dcOutput={unit.dcOutput}
          timestampRef={timestampRef}
          frameCount={frameCount}
        />

        {/* Flow arrows */}
        <pixiGraphics draw={drawFlows} />

        {/* Labels */}
        {labels}
      </Application>

      {popoverData && (
        <RackInfoPopover
          rack={popoverData.rack}
          x={popoverData.x}
          y={popoverData.y}
          visible={true}
          onClose={() => setPopoverData(null)}
        />
      )}
    </S.CanvasWrap>
  );
});

// ── BSCGraphicV2 ─────────────────────────────────────────────────────────────

export const BSCGraphicV2: React.FC<BSCGraphicProps> = ({
  deviceId,
  bscUnits,
  flowDirection,
  width = "100%",
  onRackClick,
  onBreakerToggle,
  bordered = true,
  showRefresh = true,
}) => {
  const [redrawKey, setRedrawKey] = useState(0);
  const [zoomEnabled, setZoomEnabled] = useState(false);

  const handleRefresh = useCallback(() => setRedrawKey((v) => v + 1), []);
  const toggleZoom = useCallback(() => setZoomEnabled((v) => !v), []);

  const statusLabel =
    flowDirection === "Charge" ? "CHARGE"
    : flowDirection === "Discharge" ? "DISCHARGE"
    : "IDLE";

  const RefreshIcon = SCADA_ICONS.refresh;
  const ZoomIcon = SCADA_ICONS.zoomIn;

  return (
    <S.Container
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        borderRadius: bordered ? "16px" : "0",
        border: bordered ? "1px solid #2a2a3a" : "none",
      }}
    >
      <S.Header>
        <S.HeaderLeft>
          <S.DeviceLabel>{deviceId}</S.DeviceLabel>
          <S.FlowBadge $status={flowDirection}>{statusLabel}</S.FlowBadge>
        </S.HeaderLeft>
        <S.HeaderRight>
          {bscUnits.length > 1 && (
            <S.BSCLabel>{bscUnits.length}× BSC</S.BSCLabel>
          )}
          <S.ZoomButton onClick={toggleZoom} $active={zoomEnabled} title="Yakınlaştır">
            <ZoomIcon size={18} />
          </S.ZoomButton>
          {showRefresh && (
            <S.IconBtn onClick={handleRefresh} title="Yeniden çiz">
              <RefreshIcon size={18} />
            </S.IconBtn>
          )}
        </S.HeaderRight>
      </S.Header>
      {bscUnits.map((unit, i) => (
        <BSCV2Canvas
          key={i}
          unit={unit}
          flowDirection={flowDirection}
          onRackClick={onRackClick}
          onBreakerToggle={(pos) => onBreakerToggle?.(i, pos)}
          refreshCounter={redrawKey}
          zoomEnabled={zoomEnabled}
        />
      ))}
    </S.Container>
  );
};

BSCGraphicV2.displayName = "BSCGraphicV2";
