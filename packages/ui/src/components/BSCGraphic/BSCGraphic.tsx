import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text } from "pixi.js";
import type { Graphics as GraphicsType } from "pixi.js";
import type { BSCGraphicProps, BSCUnit, BSCPositions, StepConfig } from "./BSCGraphic.types";
import { calculateStepConfig, getRackPositions } from "./BSCGraphic.utils";
import {
  useWebGLDetect,
  usePixiResize,
  usePixiTicker,
} from "./BSCGraphic.hooks";
import {
  drawRack,
  drawCables,
  drawConvergence,
  drawCircuitBreaker,
  drawOutput,
  drawFlowArrows,
} from "./BSCGraphic.drawers";
import { buildLabels } from "./BSCGraphic.labels";
import { usePixiZoom } from "../../hooks/usePixiZoom";
import { SCADA_ICONS } from "../../icons";
import * as S from "./BSCGraphic.styles";

extend({ Container, Graphics, Text });

// ── BSCCanvas ── one per BSC unit, has its own PIXI hooks ─────────────────

const BSCCanvas: React.FC<{
  unit: BSCUnit;
  flowDirection: "Charge" | "Discharge" | "Idle";
  onRackClick?: (rackId: number) => void;
  onBreakerToggle?: (position: "open" | "close") => void;
  refreshCounter?: number;
  zoomEnabled: boolean;
}> = React.memo(function BSCCanvas({
  unit,
  flowDirection,
  onRackClick,
  onBreakerToggle,
  refreshCounter,
  zoomEnabled,
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  const [config, setConfig] = useState<StepConfig | null>(null);
  const [positions, setPositions] = useState<BSCPositions | null>(null);
  const [redrawKey, setRedrawKey] = useState(0);
  const [breakerStatus, setBreakerStatus] = useState(unit.breakerStatus ?? "online");
  const [breakerPosition, setBreakerPosition] = useState(unit.breakerPosition ?? "close");

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
    const newConfig = calculateStepConfig(dimensions.width);
    setConfig(newConfig);
    setPositions(getRackPositions(newConfig));
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
    (app: any) => { onInit(app); zoom.onAppInit(app); },
    [onInit, zoom.onAppInit],
  );

  const drawAll = useCallback(
    (g: GraphicsType) => {
      if (!config || !positions) return;
      drawCables(g, config, positions);
      drawConvergence(g, config, positions, breakerStatus, breakerPosition);
      drawCircuitBreaker(g, config, positions, breakerStatus, breakerPosition, timestampRef);
      drawFlowArrows(g, config, positions, flowDirection, breakerStatus, breakerPosition, unit.dcOutput, timestampRef);
    },
    [config, positions, flowDirection, breakerStatus, breakerPosition, unit.dcOutput, frameCount],
  );

  const drawOut = useCallback(
    (g: GraphicsType) => {
      if (!config || !positions) return;
      drawOutput(g, config, positions, unit.dcOutput, timestampRef);
    },
    [config, positions, unit.dcOutput, frameCount],
  );

  const textComponents = useMemo(() => {
    if (!config || !positions) return [];
    return buildLabels({
      config, positions,
      racks: unit.racks,
      deviceId: unit.deviceId,
      flowDirection,
      showFlowDirection: false,
      breakerStatus, breakerPosition,
      dcOutput: unit.dcOutput,
      canvasWidth: dimensions.width,
    });
  }, [config, positions, unit.racks, unit.deviceId, flowDirection, breakerStatus, breakerPosition, unit.dcOutput, dimensions.width, redrawKey]);

  if (!config || !positions) {
    return (
      <S.CanvasWrap ref={containerRef}>
        <S.Loading>Yükleniyor...</S.Loading>
      </S.CanvasWrap>
    );
  }

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
        <pixiGraphics draw={drawAll} />
        {positions.racks.map((rackPos, idx) => (
          <pixiGraphics
            key={unit.racks[idx]?.id ?? rackPos.id}
            draw={(g: GraphicsType) => drawRack(g, rackPos, unit.racks[idx]!, config, flowDirection)}
            interactive cursor="pointer"
            onClick={() => onRackClick?.(unit.racks[idx]?.id ?? rackPos.id)}
          />
        ))}
        <pixiGraphics draw={drawOut} />
        <pixiGraphics
          key="breaker"
          draw={(g: GraphicsType) => {
            if (!positions) return;
            const { circuitBreaker: cb, convergence: cv, topBusY, bottomBusY } = positions;
            const cy = (topBusY + bottomBusY) / 2;
            g.clear();
            g.rect(cv.x + config.step * 0.2, cy - config.step * 0.5, cb.endX - cv.x - config.step * 0.2, config.step * 1.0);
            g.fill({ color: 0xffffff, alpha: 0.001 });
          }}
          interactive cursor={breakerStatus === "online" ? "pointer" : "not-allowed"}
          onClick={handleBreakerClick}
        />
        {textComponents}
      </Application>
    </S.CanvasWrap>
  );
});

// ── BSCGraphic ── header + N × BSCCanvas ──────────────────────────────────

export const BSCGraphic: React.FC<BSCGraphicProps> = ({
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
        <BSCCanvas
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

BSCGraphic.displayName = "BSCGraphic";