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
import type { BSCGraphicProps, BSCPositions, StepConfig } from "./BSCGraphic.types";
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
import * as S from "./BSCGraphic.styles";

extend({ Container, Graphics, Text });

export const BSCGraphic: React.FC<BSCGraphicProps> = React.memo(
  function BSCGraphic({
    deviceId,
    racks,
    width = "100%",
    flowDirection,
    breakerStatus: initialBreakerStatus = "online",
    breakerPosition: initialBreakerPosition = "close",
    dcOutput,
    onRackClick,
    onBreakerToggle,
    showRefresh = true,
    showFlowDirection = true,
    bordered = true,
    refreshCounter,
  }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<any>(null);
    const isMountedRef = useRef(true);

    const [config, setConfig] = useState<StepConfig | null>(null);
    const [positions, setPositions] = useState<BSCPositions | null>(null);
    const [redrawKey, setRedrawKey] = useState(0);
    const [breakerStatus, setBreakerStatus] = useState(initialBreakerStatus);
    const [breakerPosition, setBreakerPosition] = useState(
      initialBreakerPosition,
    );

    const dimensions = usePixiResize(containerRef, width);
    const { timestampRef, frameCount, onInit } = usePixiTicker();
    const webglOverride = useWebGLDetect();

    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      setBreakerStatus(initialBreakerStatus);
      setBreakerPosition(initialBreakerPosition);
    }, [initialBreakerStatus, initialBreakerPosition]);

    // Recalculate config and positions when dimensions change
    useEffect(() => {
      if (!isMountedRef.current) return;

      const newConfig = calculateStepConfig(dimensions.width);
      const newPositions = getRackPositions(newConfig);

      setConfig(newConfig);
      setPositions(newPositions);

      if (appRef.current?.renderer) {
        appRef.current.renderer.resize(dimensions.width, dimensions.height);
      }
    }, [dimensions]);

    // Cleanup PIXI app on unmount
    useEffect(() => {
      return () => {
        if (appRef.current) {
          try {
            appRef.current.destroy(true, true);
          } catch (e) {
            console.error("Error destroying PIXI app:", e);
          }
          appRef.current = null;
        }
      };
    }, []);

    const handleBreakerClick = useCallback(() => {
      if (breakerStatus === "offline") return;
      const newPosition = breakerPosition === "close" ? "open" : "close";
      setBreakerPosition(newPosition);
      onBreakerToggle?.(newPosition);
    }, [breakerStatus, breakerPosition, onBreakerToggle]);

    const handleRefresh = useCallback(() => {
      setRedrawKey((prev) => prev + 1);
    }, []);

    const drawAllCables = useCallback(
      (g: GraphicsType) => {
        if (!config || !positions) return;
        drawCables(g, config, positions);
        drawConvergence(
          g,
          config,
          positions,
          breakerStatus,
          breakerPosition,
        );
        drawCircuitBreaker(
          g,
          config,
          positions,
          breakerStatus,
          breakerPosition,
          timestampRef,
        );
        drawFlowArrows(
          g,
          config,
          positions,
          flowDirection,
          breakerStatus,
          breakerPosition,
          dcOutput,
          timestampRef,
        );
      },
      [config, positions, flowDirection, breakerStatus, breakerPosition, dcOutput, frameCount],
    );

    const drawOutputGraphic = useCallback(
      (g: GraphicsType) => {
        if (!config || !positions) return;
        drawOutput(g, config, positions, dcOutput, timestampRef);
      },
      [config, positions, dcOutput, frameCount],
    );

    const textComponents = useMemo(() => {
      if (!config || !positions) return [];
      return buildLabels({
        config,
        positions,
        racks,
        deviceId,
        flowDirection,
        showFlowDirection,
        breakerStatus,
        breakerPosition,
        dcOutput,
        canvasWidth: dimensions.width,
      });
    }, [
      config,
      positions,
      racks,
      deviceId,
      flowDirection,
      breakerStatus,
      breakerPosition,
      dcOutput,
      dimensions.width,
      redrawKey,
    ]);

    if (!config || !positions) {
      return (
        <S.Container
          ref={containerRef}
          style={{ width: typeof width === "number" ? `${width}px` : width }}
        >
          <S.Loading>Yükleniyor...</S.Loading>
        </S.Container>
      );
    }

    return (
      <S.Container
        ref={containerRef}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          borderRadius: bordered ? "16px" : "0",
          border: bordered ? "1px solid #2a2a3a" : "none",
        }}
      >
        {showRefresh && (
          <S.RefreshButton onClick={handleRefresh} title="Yeniden çiz">
            ↻
          </S.RefreshButton>
        )}
        <Application
          key={redrawKey + (refreshCounter ?? 0)}
          ref={appRef}
          {...webglOverride}
          onInit={onInit}
          width={dimensions.width}
          height={dimensions.height}
          background={0x1f1f2e}
          antialias
          resolution={window.devicePixelRatio || 1}
        >
          <pixiGraphics draw={drawAllCables} />
          {positions.racks.map((rackPos, idx) => (
            <pixiGraphics
              key={racks[idx]?.id ?? rackPos.id}
              draw={(g: GraphicsType) =>
                drawRack(g, rackPos, racks[idx]!, config, flowDirection)
              }
              interactive
              cursor="pointer"
              onClick={() => onRackClick?.(racks[idx]?.id ?? rackPos.id)}
            />
          ))}
          <pixiGraphics
            draw={(g: GraphicsType) =>
              drawOutputGraphic(g)
            }
          />
          <pixiGraphics
            key="breaker-hit-area"
            draw={(g: GraphicsType) => {
              if (!positions) return;
              const { circuitBreaker: cb, convergence: cv, topBusY, bottomBusY } = positions;
              const centerY = (topBusY + bottomBusY) / 2;
              const hitStartX = cv.x + config.step * 0.2;
              const hitW = cb.endX - hitStartX;
              g.clear();
              g.rect(hitStartX - 4, centerY - config.step * 0.5, hitW + 8, config.step * 1.0);
              g.fill({ color: 0xffffff, alpha: 0.001 });
            }}
            interactive
            cursor={breakerStatus === "online" ? "pointer" : "not-allowed"}
            onClick={handleBreakerClick}
          />
          {textComponents}
        </Application>
      </S.Container>
    );
  },
);

BSCGraphic.displayName = "BSCGraphic";
