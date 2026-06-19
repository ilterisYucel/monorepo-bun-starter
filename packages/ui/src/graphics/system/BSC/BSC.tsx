import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";

import type { BSCGraphicProps, BSCUnit, BSCPositions, StepConfig } from "../../deprecated/BSCGraphic/BSCGraphic.types";
import { calculateStepConfig, getRackPositions } from "../../deprecated/BSCGraphic/BSCGraphic.utils";
import { useWebGLDetect, usePixiResize } from "../../deprecated/BSCGraphic/BSCGraphic.hooks";
import { usePixiZoom } from "../../../hooks/usePixiZoom";
import { SCADA_ICONS } from "../../../icons";
import type { Rack } from "../../../types";
import type { RackCellConfig } from "../../elements/RackCell/RackCell.types";
import {
  RackCell,
  RackInfoPopover,
  CableBus,
  CircuitBreaker,
  DCOutput,
  Cable,
} from "../../elements";
import type { Point2D } from "../../types";

import * as S from "./BSC.styles";

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
  const prevDimsRef = useRef({ width: 0, height: 0 });

  const [config, setConfig] = useState<StepConfig | null>(null);
  const [positions, setPositions] = useState<BSCPositions | null>(null);
  const [resizeKey, setResizeKey] = useState(0);
  const [breakerStatus, setBreakerStatus] = useState(unit.breakerStatus ?? "online");
  const [breakerPosition, setBreakerPosition] = useState(unit.breakerPosition ?? "close");
  const [popoverData, setPopoverData] = useState<{ rack: Rack; x: number; y: number } | null>(null);

  const rackCellConfig: RackCellConfig | null = config
    ? { step: config.step, rackWidth: config.rackWidth, rackHeight: config.rackHeight }
    : null;

  const { dimensions } = usePixiResize(containerRef, "100%");

  const stableDimensions = useMemo(() => {
    if (dimensions.width === prevDimsRef.current.width && dimensions.height === prevDimsRef.current.height) {
      return prevDimsRef.current;
    }
    prevDimsRef.current = dimensions;
    return dimensions;
  }, [dimensions]);

  const timestampRef = useRef(0);

  const onInit = useCallback(
    (app: any) => {
      app.ticker.add((ticker: { deltaMS: number }) => {
        timestampRef.current += ticker.deltaMS;
      });
    },
    [],
  );

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
    const c = calculateStepConfig(stableDimensions.width);
    setConfig(c);
    setPositions(getRackPositions(c));
  }, [stableDimensions]);

  useEffect(() => {
    setResizeKey(k => k + 1);
  }, [stableDimensions]);

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
          const boxW = step * 1.4;
          const boxH = step * 1.5;
          const boxR = step * 0.08;
          const ly = cbCenterY + step * 0.7;
          const boxY = ly - step * 0.3;
          const boxX = cbCenterX - boxW / 2;
          const cbStatusColor = breakerStatus === "online" ? 0x10b981 : 0xef4444;
          const cbPosColor = breakerPosition === "close" ? 0x10b981 : 0xf59e0b;

          return (
            <>
              <pixiGraphics
                key="cb-box"
                draw={(g) => {
                  g.clear();
                  g.roundRect(boxX, boxY, boxW, boxH, boxR);
                  g.fill({ color: 0x0a0a1a, alpha: 0.85 });
                  g.stroke({ width: Math.max(0.4, step * 0.015), color: 0x3d3d5e, alpha: 0.6 });
                }}
              />
              <pixiText key="cb-label" text="CB" x={cbCenterX} y={ly} anchor={0.5}
                style={{ fontSize: smallFs + 4, fill: 0x9ca3af, fontFamily: "monospace", fontWeight: "bold" }} />
              <pixiText key="cb-status" text={breakerStatus === "online" ? "Online" : "Offline"} x={cbCenterX} y={ly + step * 0.48} anchor={0.5}
                style={{ fontSize: smallFs + 1, fill: cbStatusColor, fontFamily: "monospace", fontWeight: "bold" }} />
              <pixiText key="cb-pos" text={breakerPosition === "close" ? "Closed" : "Open"} x={cbCenterX} y={ly + step * 0.88} anchor={0.5}
                style={{ fontSize: smallFs + 1, fill: cbPosColor, fontFamily: "monospace", fontWeight: "bold" }} />
            </>
          );
        })()}

        {/* DC Output labels */}
        {(() => {
          const dcX = output.x + step * 0.5;
          return (
            <>
              <pixiText key="out-label" text="DC" x={dcX} y={output.y - output.radius - step * 0.25} anchor={0.5}
                style={{ fontSize: fs, fill: 0xffffff, fontFamily: "monospace", fontWeight: "bold" }} />
              {unit.dcOutput && (
                <>
                  <pixiGraphics
                    key="dc-box"
                    draw={(g) => {
                      const bx = dcX - step * 0.7;
                      const by = output.y + output.radius + step * 0.15;
                      g.clear();
                      g.roundRect(bx, by, step * 1.4, step * 0.85, step * 0.08);
                      g.fill({ color: 0x0a0a1a, alpha: 0.85 });
                      g.stroke({ width: Math.max(0.4, step * 0.015), color: 0x3d3d5e, alpha: 0.6 });
                    }}
                  />
                  <pixiText key="out-v" text={`${unit.dcOutput.voltage}V`} x={dcX} y={output.y + output.radius + step * 0.4} anchor={0.5}
                    style={{ fontSize: smallFs + 3, fill: 0x9ca3af, fontFamily: "monospace" }} />
                  <pixiText key="out-a" text={`${unit.dcOutput.current}A`} x={dcX} y={output.y + output.radius + step * 0.8} anchor={0.5}
                    style={{ fontSize: smallFs + 3, fill: 0xf59e0b, fontFamily: "monospace", fontWeight: "bold" }} />
                </>
              )}
            </>
          );
        })()}
      </>
    );
  }, [config, positions, breakerStatus, breakerPosition, unit.dcOutput]);

  const cableBusPositions = useMemo(() => {
    if (!config || !positions) return null;
    return {
      racks: positions.racks,
      topBusY: positions.topBusY,
      bottomBusY: positions.bottomBusY,
      convergenceX: positions.convergence.x,
      cbLeftMid: { x: positions.convergence.x + config.step * 0.2, y: (positions.topBusY + positions.bottomBusY) / 2 },
    };
  }, [positions, config]);

  const cbOutputPath: Point2D[] | null = useMemo(() => {
    if (!config || !positions) return null;
    const centerY = (positions.topBusY + positions.bottomBusY) / 2;
    const dcGapX = positions.output.x + config.step * 0.5 - positions.output.radius;
    return [
      { x: positions.circuitBreaker.endX, y: centerY },
      { x: dcGapX, y: centerY },
    ];
  }, [positions, config]);

  if (!config || !positions) {
    return (
      <S.CanvasWrap ref={containerRef}>
        <S.Loading>Yükleniyor...</S.Loading>
      </S.CanvasWrap>
    );
  }

  const headerFontSize = Math.max(13, config.step * 0.36);
  const cableBusPos = cableBusPositions!;
  const cbOutPath = cbOutputPath!;
  const dcGap = config.step * 0.5;
  const dcX = positions.output.x + dcGap;

  return (
    <S.CanvasWrap
      ref={containerRef}
      onMouseEnter={zoom.onMouseEnter}
      onMouseMove={zoom.onMouseMove}
      onMouseLeave={zoom.onMouseLeave}
    >
      <Application
        key={resizeKey + (refreshCounter ?? 0)}
        ref={appRef}
        {...webglOverride}
        onInit={combinedOnInit}
        width={dimensions.width}
        height={dimensions.height}
        background={0x1a1a2e}
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

        {/* Cables */}
        <CableBus config={config} positions={cableBusPos} flowDirection={flowDirection.toLowerCase() as "charge" | "discharge" | "idle"} />

        {/* CB → DC output cable */}
        <Cable
          path={cbOutPath}
          flowDirection={flowDirection.toLowerCase() as "charge" | "discharge" | "idle"}
          step={config.step}
        />

        {/* Rack cells */}
        {positions.racks.map((pos, i) => (
          <RackCell
            key={unit.racks[i]?.id ?? pos.id}
            rack={unit.racks[i]!}
            x={pos.x}
            y={pos.y}
            config={rackCellConfig!}
            flowDirection={flowDirection}
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
          onClick={handleBreakerClick}
        />

        {/* DC Output */}
        <DCOutput
          config={config}
          output={{ ...positions.output, x: dcX }}
          dcOutput={unit.dcOutput}
        />

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

export const BSC: React.FC<BSCGraphicProps> = ({
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

BSC.displayName = "BSC";
