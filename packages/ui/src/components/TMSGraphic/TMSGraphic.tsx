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
import type { TMSGraphicProps, StepConfig, TMSLayout } from "./TMSGraphic.types";
import { calculateStepConfig, getTMSLayout } from "./TMSGraphic.utils";
import {
  useWebGLDetect,
  usePixiResize,
  usePixiTicker,
} from "./TMSGraphic.hooks";
import {
  drawRoomBorder,
  drawRoomFill,
  drawHvac,
  drawHvacAnimation,
  drawPanel,
} from "./TMSGraphic.drawers";
import { buildLabels } from "./TMSGraphic.labels";
import * as S from "./TMSGraphic.styles";

extend({ Container, Graphics, Text });

export const TMSGraphic: React.FC<TMSGraphicProps> = React.memo(
  function TMSGraphic({
    rooms,
    panel_temp,
    status = "online",
    width = "100%",
    bordered = true,
    showRefresh = true,
  }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<any>(null);
    const isMountedRef = useRef(true);

    const [config, setConfig] = useState<StepConfig | null>(null);
    const [layout, setLayout] = useState<TMSLayout | null>(null);
    const [redrawKey, setRedrawKey] = useState(0);

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
      if (!isMountedRef.current) return;

      const roomCount = Math.max(1, rooms.length);
      const newConfig = calculateStepConfig(dimensions.width, roomCount);
      const newLayout = getTMSLayout(newConfig, roomCount);

      setConfig(newConfig);
      setLayout(newLayout);

      if (appRef.current?.renderer) {
        appRef.current.renderer.resize(dimensions.width, dimensions.height);
      }
    }, [dimensions, rooms.length]);

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

    const handleRefresh = useCallback(() => {
      setRedrawKey((prev) => prev + 1);
    }, []);

    const drawAllRooms = useCallback(
      (g: GraphicsType) => {
        if (!config || !layout) return;
        g.clear();

        for (let i = 0; i < layout.rooms.length; i++) {
          const roomPos = layout.rooms[i]!;
          const roomData = rooms[i];
          if (!roomData) continue;

          drawRoomBorder(g, roomPos, config);
          drawRoomFill(g, roomPos, config, roomData.temp);
        }
      },
      [config, layout, rooms],
    );

    const drawAllHvacs = useCallback(
      (g: GraphicsType) => {
        if (!config || !layout) return;
        g.clear();

        for (let i = 0; i < layout.rooms.length; i++) {
          const roomPos = layout.rooms[i]!;
          const roomData = rooms[i];
          if (!roomData) continue;

          drawHvac(g, roomPos.hvac1, roomData.hvacs[0], config);
          drawHvac(g, roomPos.hvac2, roomData.hvacs[1]!, config);
        }
      },
      [config, layout, rooms],
    );

    const drawAllAnimations = useCallback(
      (g: GraphicsType) => {
        if (!config || !layout) return;
        g.clear();

        for (let i = 0; i < layout.rooms.length; i++) {
          const roomPos = layout.rooms[i]!;
          const roomData = rooms[i];
          if (!roomData) continue;

          drawHvacAnimation(g, roomPos.hvac1, roomData.hvacs[0], config, timestampRef);
          drawHvacAnimation(g, roomPos.hvac2, roomData.hvacs[1]!, config, timestampRef);
        }
      },
      [config, layout, rooms, frameCount],
    );

    const drawPanelGraphic = useCallback(
      (g: GraphicsType) => {
        if (!config || !layout) return;
        g.clear();
        drawPanel(g, layout.panel, config, panel_temp);
      },
      [config, layout, panel_temp],
    );

    const textComponents = useMemo(() => {
      if (!config || !layout) return [];
      return buildLabels({
        config,
        layout,
        rooms,
        panelTemp: panel_temp,
        canvasWidth: dimensions.width,
      });
    }, [config, layout, rooms, panel_temp, dimensions.width, redrawKey]);

    if (!config || !layout) {
      return (
        <S.Container
          ref={containerRef}
          style={{ width: typeof width === "number" ? `${width}px` : width, height: dimensions.height }}
        >
          <S.Loading>Yükleniyor...</S.Loading>
        </S.Container>
      );
    }

    const estimatedHeaderHeight = 32;

    return (
      <S.Container
        ref={containerRef}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: dimensions.height,
          borderRadius: bordered ? "16px" : "0",
          border: bordered ? "1px solid #2a2a3a" : "none",
        }}
      >
        <S.Header>
          <S.HeaderLeft>
            <S.DeviceLabel>TMS</S.DeviceLabel>
            <S.StatusBadge $status={status}>
              {status === "online" ? "Online" : "Offline"}
            </S.StatusBadge>
          </S.HeaderLeft>
          <S.HeaderRight>
            {showRefresh && (
              <S.RefreshButton onClick={handleRefresh} title="Yeniden çiz">
                ↻
              </S.RefreshButton>
            )}
          </S.HeaderRight>
        </S.Header>
        <Application
          key={redrawKey}
          ref={appRef}
          {...webglOverride}
          onInit={onInit}
          width={dimensions.width}
          height={dimensions.height - estimatedHeaderHeight}
          background={0x1f1f2e}
          antialias
          resolution={window.devicePixelRatio || 1}
        >
          <pixiGraphics draw={drawAllRooms} />
          <pixiGraphics draw={drawAllHvacs} />
          <pixiGraphics draw={drawPanelGraphic} />
          <pixiGraphics draw={drawAllAnimations} />
          {textComponents}
        </Application>
      </S.Container>
    );
  },
);

TMSGraphic.displayName = "TMSGraphic";
