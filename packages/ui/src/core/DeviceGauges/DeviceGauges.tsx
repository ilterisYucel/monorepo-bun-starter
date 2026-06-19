import React, { useState, useCallback, useRef, useEffect } from "react";
import type { DeviceGaugesProps } from "./DeviceGauges.types";
import { TelemetryGauge } from "../TelemetryGauge";
import * as S from "./DeviceGauges.styles";

type AutoSize = "small" | "medium" | "large";

const SIZE_THRESHOLDS: Record<AutoSize, number> = { small: 100, medium: 140, large: 180 };

function computeAutoSize(perGauge: number): AutoSize {
  if (perGauge >= SIZE_THRESHOLDS.large) return "large";
  if (perGauge >= SIZE_THRESHOLDS.medium) return "medium";
  return "small";
}

export const DeviceGauges: React.FC<DeviceGaugesProps> = ({
  deviceId,
  gauges,
  color = "#3b82f6",
  size,
  variant = "circular",
  width = "100%",
  gap = 12,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleResize]);

  const gapCount = gauges.length - 1;
  const perGauge = (containerWidth - gap * gapCount) / gauges.length;
  const effectiveSize = size ?? computeAutoSize(perGauge);

  return (
    <S.Wrapper
      ref={wrapperRef}
      style={{ maxWidth: typeof width === "number" ? `${width}px` : width }}
    >
      <S.Header>{deviceId}</S.Header>
      <S.Grid $gap={gap}>
        {gauges.map((g, i) => (
          <S.Cell key={i}>
            <TelemetryGauge
              value={g.value}
              label={g.label}
              unit={g.unit}
              min={g.min}
              max={g.max}
              icon={g.icon}
              decimals={g.decimals}
              color={color}
              size={effectiveSize}
              variant={variant}
              width={variant === "circular" ? perGauge : undefined}
            />
          </S.Cell>
        ))}
      </S.Grid>
    </S.Wrapper>
  );
};
