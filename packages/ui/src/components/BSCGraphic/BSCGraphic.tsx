import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  type JSX,
} from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Text } from "pixi.js";
import type { BSCGraphicProps, StepConfig } from "./BSCGraphic.types";
import { calculateStepConfig, getRackPositions } from "./BSCGraphic.utils";
import * as S from "./BSCGraphic.styles";

extend({ Container, Graphics, Text });

export const BSCGraphic: React.FC<BSCGraphicProps> = React.memo(
  ({
    deviceId,
    racks,
    width = "100%",
    flowDirection,
    breakerStatus: initialBreakerStatus = "online",
    breakerPosition: initialBreakerPosition = "close",
    dcOutput,
    onRackClick,
    onBreakerToggle,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(680);
    const [config, setConfig] = useState<StepConfig | null>(null);
    const [positions, setPositions] = useState<any>(null);
    const [timestamp, setTimestamp] = useState(0);
    const [breakerStatus, setBreakerStatus] = useState(initialBreakerStatus);
    const [breakerPosition, setBreakerPosition] = useState(
      initialBreakerPosition,
    );
    const animationRef = useRef<number>(0);

    useEffect(() => {
      setBreakerStatus(initialBreakerStatus);
      setBreakerPosition(initialBreakerPosition);
    }, [initialBreakerStatus, initialBreakerPosition]);

    useEffect(() => {
      if (!containerRef.current) return;
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          let newWidth = entry.contentRect.width;
          if (typeof width === "number") newWidth = width;
          setContainerWidth(newWidth);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }, [width]);

    useEffect(() => {
      const newConfig = calculateStepConfig(containerWidth);
      setConfig(newConfig);
      setPositions(getRackPositions(newConfig));
    }, [containerWidth]);

    useEffect(() => {
      const animate = () => {
        setTimestamp((prev) => prev + 16);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }, []);

    const handleBreakerClick = useCallback(() => {
      if (breakerStatus === "offline") return;
      const newPosition = breakerPosition === "close" ? "open" : "close";
      setBreakerPosition(newPosition);
      onBreakerToggle?.(newPosition);
    }, [breakerStatus, breakerPosition, onBreakerToggle]);

    const drawRack = useCallback(
      (g: Graphics, x: number, y: number, rack: any, rackId: number) => {
        if (!config) return;
        const { rackWidth, rackHeight, step } = config;
        const fillPercent = Math.min(1, Math.max(0, (rack?.soc || 0) / 100));
        let fillColor = 0x6b7280;
        if (flowDirection === "Charge") fillColor = 0x10b981;
        if (flowDirection === "Discharge") fillColor = 0xf59e0b;

        g.clear();
        g.rect(x, y, rackWidth, rackHeight);
        g.fill(0x1e1e2e);
        g.stroke({ width: 1.5, color: 0x3d3d5e });

        const terminalWidth = Math.max(4, step * 0.2);
        const terminalHeight = Math.max(2, step * 0.1);
        g.rect(
          x + rackWidth / 2 - terminalWidth / 2,
          y - terminalHeight,
          terminalWidth,
          terminalHeight,
        );
        g.fill(0x3d3d5e);
        g.rect(
          x + rackWidth / 2 - terminalWidth / 2,
          y + rackHeight,
          terminalWidth,
          terminalHeight,
        );
        g.fill(0x3d3d5e);

        const innerPadding = Math.max(2, step * 0.08);
        const innerWidth = rackWidth - innerPadding * 2;
        const innerHeight = rackHeight - innerPadding * 2;
        const fillHeight = innerHeight * fillPercent;
        g.rect(
          x + innerPadding,
          y + innerPadding + (innerHeight - fillHeight),
          innerWidth,
          fillHeight,
        );
        g.fill(fillColor);

        if (rack?.charge_status === "Charge") {
          g.stroke({ width: 2, color: 0x10b981 });
        } else if (rack?.charge_status === "Discharge") {
          g.stroke({ width: 2, color: 0xf59e0b });
        }
      },
      [config, flowDirection],
    );

    const drawBreaker = useCallback(
      (g: Graphics, x: number, y: number) => {
        if (!config) return;
        const isActive = breakerStatus === "online";
        const isClosed = breakerPosition === "close";
        const borderColor = isActive
          ? isClosed
            ? 0x10b981
            : 0xf59e0b
          : 0xef4444;
        const bgAlpha = isActive ? 0.2 : 0.1;

        g.clear();
        g.rect(x, y, config.breakerWidth, config.breakerHeight);
        g.fill({ color: borderColor, alpha: bgAlpha });
        g.rect(x + 2, y + 2, config.breakerWidth - 4, config.breakerHeight - 4);
        g.fill(isActive ? (isClosed ? 0x10b981 : 0xf59e0b) : 0xef4444);
        g.stroke({ width: 1.5, color: borderColor });

        const centerX = x + config.breakerWidth / 2;
        const centerY = y + config.breakerHeight / 2;
        const swSize = Math.max(3, config.step * 0.15);

        g.moveTo(centerX, centerY - swSize);
        g.lineTo(centerX, centerY + swSize);
        g.stroke({ width: 1.5, color: 0xffffff });

        if (isClosed) {
          g.moveTo(centerX - swSize / 2, centerY);
          g.lineTo(centerX + swSize / 2, centerY);
          g.stroke({ width: 1.5, color: 0xffffff });
        } else {
          g.moveTo(centerX - swSize / 2, centerY - swSize / 2);
          g.lineTo(centerX + swSize / 2, centerY + swSize / 2);
          g.stroke({ width: 1.5, color: 0xffffff });
          g.moveTo(centerX - swSize / 2, centerY + swSize / 2);
          g.lineTo(centerX + swSize / 2, centerY - swSize / 2);
          g.stroke({ width: 1.5, color: 0xffffff });
        }

        g.circle(centerX, y + 4, 2);
        g.fill(isActive ? 0x10b981 : 0xef4444);
      },
      [config, breakerStatus, breakerPosition],
    );

    const drawOutput = useCallback(
      (g: Graphics, x: number, y: number) => {
        if (!config) return;
        const isActive = dcOutput?.status === "online";
        const color = isActive ? 0x3b82f6 : 0x6b7280;
        const glowSize = isActive ? 1.5 + Math.sin(timestamp * 0.005) * 0.8 : 0;

        g.clear();
        if (isActive && glowSize > 0) {
          g.circle(
            x + config.outputWidth / 2,
            y + config.outputHeight / 2,
            config.outputWidth / 2 + glowSize,
          );
          g.fill({ color: 0x3b82f6, alpha: 0.2 });
        }
        g.circle(
          x + config.outputWidth / 2,
          y + config.outputHeight / 2,
          config.outputWidth / 2,
        );
        g.fill(color);
        g.stroke({ width: 1.5, color: 0x3d3d5e });

        const centerX = x + config.outputWidth / 2;
        const centerY = y + config.outputHeight / 2;
        const boltSize = Math.max(3, config.step * 0.12);
        g.moveTo(centerX + boltSize / 2, centerY - boltSize);
        g.lineTo(centerX - boltSize / 2, centerY);
        g.lineTo(centerX + boltSize / 3, centerY);
        g.lineTo(centerX - boltSize / 2, centerY + boltSize);
        g.stroke({ width: 1.5, color: 0xffffff });
        g.circle(centerX, y + 4, 2);
        g.fill(isActive ? 0x3b82f6 : 0x6b7280);
      },
      [config, dcOutput, timestamp],
    );

    const drawCables = useCallback(
      (g: Graphics) => {
        if (!config || !positions) return;

        const breakerX = positions.breaker.x + config.breakerWidth / 2;
        const breakerY = positions.breaker.y + config.breakerHeight / 2;
        const firstRackX = positions.racks[0].x + config.rackWidth / 2;
        const lastRackX = positions.racks[7].x + config.rackWidth / 2;
        const cableY = positions.racks[0].y + config.rackHeight / 2;
        const outputX = positions.output.x + config.outputWidth / 2;

        const canFlow =
          flowDirection !== "Idle" &&
          breakerStatus === "online" &&
          breakerPosition === "close" &&
          dcOutput?.status === "online";

        const flowProgress = canFlow ? (timestamp % 2500) / 2500 : 0;
        const flowColor = flowDirection === "Charge" ? 0x10b981 : 0xf59e0b;

        g.clear();

        g.setStrokeStyle({
          width: Math.max(1.2, config.step * 0.05),
          color: 0x5a5a7a,
        });

        g.moveTo(firstRackX, cableY);
        g.lineTo(lastRackX, cableY);

        for (const rack of positions.racks) {
          const rackCenterX = rack.x + config.rackWidth / 2;
          g.moveTo(rackCenterX, rack.y + config.rackHeight);
          g.lineTo(rackCenterX, cableY);
        }

        g.moveTo(lastRackX, cableY);
        g.lineTo(breakerX, cableY);
        g.lineTo(breakerX, breakerY);
        g.moveTo(breakerX, breakerY);
        g.lineTo(outputX, breakerY);
        g.lineTo(outputX, positions.output.y + config.outputHeight / 2);

        if (canFlow) {
          const startX = flowDirection === "Charge" ? outputX : breakerX;
          const endX = flowDirection === "Charge" ? breakerX : outputX;
          const distance = endX - startX;

          for (let i = 0; i < 3; i++) {
            const phase = i * 0.25;
            let offset = (flowProgress + phase) % 1;
            const x = startX + distance * offset;
            const y = breakerY;
            const arrowSize = Math.max(2.5, config.step * 0.08);
            g.moveTo(x + arrowSize, y);
            g.lineTo(x, y - arrowSize / 2);
            g.lineTo(x, y + arrowSize / 2);
            g.fill(flowColor);
          }
        }
      },
      [
        config,
        positions,
        flowDirection,
        breakerStatus,
        breakerPosition,
        dcOutput,
        timestamp,
      ],
    );

    const textComponents = useMemo(() => {
      if (!config || !positions) return [];

      const components: JSX.Element[] = [];
      const headerFontSize = Math.max(11, config.step * 0.32); // 0.28 -> 0.32
      const fontSize = Math.max(8, config.step * 0.23); // 0.2 -> 0.23
      const smallFontSize = Math.max(7, config.step * 0.21); // 0.18 -> 0.21
      const tinyFontSize = Math.max(6, config.step * 0.17); // 0.14 -> 0.17

      // Header - Device ID (sol üst)
      components.push(
        <pixiText
          key="device-id"
          text={deviceId}
          x={config.step}
          y={config.step * 0.4}
          anchor={0.5}
          style={{
            fontSize: headerFontSize,
            fill: 0xe5e7eb,
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
        />,
      );

      // Header - Flow Direction (sağ üst)
      components.push(
        <pixiText
          key="flow-direction"
          text={
            flowDirection === "Charge"
              ? "CHARGE"
              : flowDirection === "Discharge"
                ? "DISCHARGE"
                : "IDLE"
          }
          x={containerWidth - config.step * 1.5}
          y={config.step * 0.4}
          anchor={0.5}
          style={{
            fontSize: headerFontSize,
            fill:
              flowDirection === "Charge"
                ? 0x10b981
                : flowDirection === "Discharge"
                  ? 0xf59e0b
                  : 0x6b7280,
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
        />,
      );

      // Rack'ler
      positions.racks.forEach((rack: any, idx: number) => {
        const rackData = racks[idx];
        const isOnline = rackData?.status === "online";

        components.push(
          <pixiText
            key={`id-${rack.id}`}
            text={`R${String(rack.id).padStart(2, "0")}`}
            x={rack.x + config.step * 0.1}
            y={rack.y + config.step * 0.1}
            style={{
              fontSize,
              fill: 0xe5e7eb,
              fontFamily: "monospace",
              fontWeight: "bold",
            }}
          />,
          <pixiText
            key={`status-${rack.id}`}
            anchor={0.5}
            text={isOnline ? "Online" : "Offline"}
            x={rack.x + config.rackWidth / 2}
            y={rack.y + config.step * 0.8}
            style={{
              fontSize: smallFontSize,
              fill: isOnline ? 0x10b981 : 0xef4444,
              fontFamily: "monospace",
            }}
          />,
          <pixiText
            key={`voltage-${rack.id}`}
            text={`${rackData?.voltage?.toFixed(1) || "0.0"}V`}
            anchor={0.5}
            x={rack.x + config.rackWidth / 2}
            y={rack.y + config.step * 1.6}
            style={{
              fontSize: smallFontSize,
              fill: 0xffffff,
              fontFamily: "monospace",
              fontWeight: "bold",
              align: "center",
            }}
          />,
          <pixiText
            key={`charge-status-${rack.id}`}
            text={
              rackData?.charge_status === "Charge"
                ? "Charge"
                : rackData?.charge_status === "Discharge"
                  ? "Discharge"
                  : "Idle"
            }
            anchor={0.5}
            x={rack.x + config.rackWidth / 2}
            y={rack.y + config.step * 2.4}
            style={{
              fontSize: smallFontSize,
              fill:
                rackData?.charge_status === "Charge"
                  ? 0x10b981
                  : rackData?.charge_status === "Discharge"
                    ? 0xf59e0b
                    : 0x6b7280,
              fontFamily: "monospace",
              fontWeight: "bold",
            }}
          />,
          <pixiText
            key={`soc-${rack.id}`}
            text={`${rackData?.soc?.toFixed(1)}%`}
            anchor={0.5}
            x={rack.x + config.rackWidth / 2}
            y={rack.y + config.step * 3.2}
            style={{
              fontSize: smallFontSize,
              fill: 0x00ff00,
              fontFamily: "monospace",
              fontWeight: "bold",
            }}
          />,
        );
      });

      const isBreakerActive = breakerStatus === "online";
      const isBreakerClosed = breakerPosition === "close";
      components.push(
        <pixiText
          key="cb-active"
          text={isBreakerActive ? "Online" : "Offline"}
          anchor={0.5}
          x={positions.breaker.x + config.breakerWidth / 2}
          y={positions.breaker.y + config.breakerHeight + config.step * 0.15}
          style={{
            fontSize: tinyFontSize + 2,
            fill: isBreakerClosed ? 0x10b981 : 0xf59e0b,
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
        />,
        <pixiText
          key="cb-position"
          text={isBreakerClosed ? "Close" : "Open"}
          anchor={0.5}
          x={positions.breaker.x + config.breakerWidth / 2}
          y={positions.breaker.y + config.breakerHeight + config.step * 0.35}
          style={{
            fontSize: tinyFontSize + 2,
            fill: isBreakerClosed ? 0x10b981 : 0xf59e0b,
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
        />,
      );

      const isOutputActive = dcOutput?.status === "online";
      components.push(
        <pixiText
          key="out-label"
          text="DC"
          anchor={0.5}
          x={positions.output.x + config.outputWidth / 2}
          y={positions.output.y + config.outputHeight / 2 - config.step * 0.28}
          style={{
            fontSize: Math.max(7, config.step * 0.19),
            fill: 0xffffff,
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
        />,
      );

      // Footer - CB ve DC çıkışın altına
      if (dcOutput) {
        components.push(
          <pixiText
            key="out-voltage"
            text={`${dcOutput.voltage}V`}
            anchor={0.5}
            x={positions.output.x + config.outputWidth / 2}
            y={positions.output.y + config.outputHeight + config.step * 0.05}
            style={{
              fontSize: tinyFontSize + 2,
              fill: 0x9ca3af,
              fontFamily: "monospace",
            }}
          />,
          <pixiText
            key="out-current"
            text={`${dcOutput.current}A`}
            anchor={0.5}
            x={positions.output.x + config.outputWidth / 2}
            y={positions.output.y + config.outputHeight + config.step * 0.35}
            style={{
              fontSize: tinyFontSize + 2,
              fill: 0xf59e0b,
              fontFamily: "monospace",
              fontWeight: "bold",
            }}
          />,
        );
      }

      return components;
    }, [
      config,
      positions,
      racks,
      breakerStatus,
      breakerPosition,
      dcOutput,
      containerWidth,
      flowDirection,
      deviceId,
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
        style={{ width: typeof width === "number" ? `${width}px` : width }}
      >
        <Application
          width={containerWidth}
          height={containerWidth / 2}
          background={0x1f1f2e}
          antialias={true}
          resolution={window.devicePixelRatio || 1}
        >
          <pixiGraphics draw={drawCables} />
          {positions.racks.map((rack: any, idx: number) => (
            <pixiGraphics
              key={rack.id}
              draw={(g: Graphics) =>
                drawRack(g, rack.x, rack.y, racks[idx], rack.id)
              }
              interactive
              cursor="pointer"
              onClick={() => onRackClick?.(rack.id)}
            />
          ))}
          <pixiGraphics
            draw={(g: Graphics) =>
              drawBreaker(g, positions.breaker.x, positions.breaker.y)
            }
            interactive
            cursor={breakerStatus === "online" ? "pointer" : "not-allowed"}
            onClick={handleBreakerClick}
          />
          <pixiGraphics
            draw={(g: Graphics) =>
              drawOutput(g, positions.output.x, positions.output.y)
            }
          />
          {textComponents}
        </Application>
      </S.Container>
    );
  },
);

BSCGraphic.displayName = "BSCGraphic";
