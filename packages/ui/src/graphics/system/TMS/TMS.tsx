import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text, Sprite } from "pixi.js";

import type { TMSGraphicProps, StepConfig, TMSLayout } from "../../deprecated/TMSGraphic/TMSGraphic.types";
import { calculateStepConfig, getTMSLayout } from "../../deprecated/TMSGraphic/TMSGraphic.utils";
import { useWebGLDetect, usePixiResize } from "../../deprecated/TMSGraphic/TMSGraphic.hooks";
import { usePixiZoom } from "../../../hooks/usePixiZoom";
import { SCADA_ICONS } from "../../../icons";
import { RoomCard, HvacUnit, PanelCard } from "../../elements";

import * as S from "./TMS.styles";

extend({ Container, Graphics, Text, Sprite });

export const TMS: React.FC<TMSGraphicProps> = React.memo(
  function TMSGraphicV2({
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
    const [zoomEnabled, setZoomEnabled] = useState(false);

    const { dimensions, resizeKey } = usePixiResize(containerRef, width);
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
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      if (!isMountedRef.current) return;

      const roomCount = Math.max(1, rooms.length);
      const c = calculateStepConfig(dimensions.width, roomCount);
      const l = getTMSLayout(c, roomCount);

      setConfig(c);
      setLayout(l);
    }, [dimensions, rooms.length]);

    useEffect(() => {
      return () => {
        if (appRef.current) {
          try {
            appRef.current.destroy(true, true);
          } catch (_) {}
          appRef.current = null;
        }
      };
    }, []);

    const handleRefresh = useCallback(() => {
      setRedrawKey((prev) => prev + 1);
    }, []);

    const toggleZoom = useCallback(() => {
      setZoomEnabled((v) => !v);
    }, []);

    const RefreshIcon = SCADA_ICONS.refresh;
    const ZoomIcon = SCADA_ICONS.zoomIn;

    const zoom = usePixiZoom({ enabled: zoomEnabled });

    const combinedOnInit = useCallback(
      (app: any) => {
        onInit(app);
        zoom.onAppInit(app);
      },
      [onInit, zoom.onAppInit],
    );

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

    const estimatedHeaderHeight = 48;

    return (
      <S.Container
        ref={containerRef}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: dimensions.height,
          borderRadius: bordered ? "16px" : "0",
          border: bordered ? "1px solid #2a2a3a" : "none",
          cursor: zoomEnabled ? "zoom-in" : "default",
        }}
        onMouseEnter={zoom.onMouseEnter}
        onMouseMove={zoom.onMouseMove}
        onMouseLeave={zoom.onMouseLeave}
      >
        <S.Header>
          <S.HeaderLeft>
            <S.DeviceLabel>TMS</S.DeviceLabel>
            <S.StatusBadge $status={status}>
              {status === "online" ? "Online" : "Offline"}
            </S.StatusBadge>
          </S.HeaderLeft>
          <S.HeaderRight>
            <S.ZoomButton onClick={toggleZoom} $active={zoomEnabled} title="Yakınlaştır">
              <ZoomIcon size={18} />
            </S.ZoomButton>
            {showRefresh && (
              <S.RefreshButton onClick={handleRefresh} title="Yeniden çiz">
                <RefreshIcon size={18} />
              </S.RefreshButton>
            )}
          </S.HeaderRight>
        </S.Header>
        <Application
          key={redrawKey + resizeKey}
          ref={appRef}
          {...webglOverride}
          onInit={combinedOnInit}
          width={dimensions.width}
          height={dimensions.height - estimatedHeaderHeight}
          background={0x1a1a2e}
          antialias
          resolution={window.devicePixelRatio || 1}
        >
          <pixiContainer y={-config.step * 0.4}>
          {/* Room cards */}
          {layout.rooms.map((roomPos, i) => {
            const roomData = rooms[i];
            if (!roomData) return null;
            return (
              <React.Fragment key={i}>
                <RoomCard
                  room={roomData}
                  roomPos={roomPos}
                  config={config}
                />
                <HvacUnit
                  hvac={roomData.hvacs[0]}
                  pos={roomPos.hvac1}
                  config={config}
                />
                {roomData.hvacs[1] && (
                  <HvacUnit
                    hvac={roomData.hvacs[1]!}
                    pos={roomPos.hvac2}
                    config={config}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* Panel card */}
          <PanelCard
            pos={layout.panel}
            panelTemp={panel_temp}
            config={config}
          />
          </pixiContainer>
        </Application>
      </S.Container>
    );
  },
);

TMS.displayName = "TMS";
