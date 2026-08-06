import React, { Suspense, useMemo } from "react";
import { Application, Entity, Gltf } from "@playcanvas/react";
import { Render, Camera, Light } from "@playcanvas/react/components";
import type { PlayCanvasViewerProps, Container3DState } from "./PlayCanvasViewer.types";
import * as S from "./PlayCanvasViewer.styles";

const CONTAINER_COLORS: Record<Container3DState["status"], [number, number, number]> = {
  online: [0.06, 0.72, 0.56],
  warning: [0.96, 0.62, 0.04],
  offline: [0.94, 0.27, 0.27],
  idle: [0.42, 0.47, 0.5],
};

const SELECTED_COLOR: [number, number, number] = [0.23, 0.51, 0.96];

const ContainerEntity: React.FC<{
  container: Container3DState;
  selected: boolean;
  modelUrl?: string;
  onClick?: (id: string) => void;
}> = ({ container, selected, modelUrl, onClick }) => {
  const color = selected ? SELECTED_COLOR : CONTAINER_COLORS[container.status];
  const scale = container.scale ?? 1;
  const s = selected ? scale * 1.1 : scale;

  return (
    <Entity
      name={container.id}
      position={container.position}
      rotation={container.rotation}
      scale={[s, s, s]}
      onClick={() => onClick?.(container.id)}
    >
      {modelUrl ? (
        <Gltf src={modelUrl} />
      ) : (
        <Render type="box" material={{ diffuse: color }} />
      )}
    </Entity>
  );
};

const Placeholder: React.FC<{ height: number | string }> = ({ height }) => (
  <S.Wrapper $height={height}>
    <S.Placeholder>3B görüntüleyici yükleniyor...</S.Placeholder>
  </S.Wrapper>
);

export const PlayCanvasViewer: React.FC<PlayCanvasViewerProps> = ({
  containers,
  onContainerClick,
  selectedContainerId,
  showGrid = true,
  showLabels = true,
  height = 400,
  modelUrl,
}) => {
  const fillMode = useMemo(() => "NONE" as const, []);

  const handleClick = (id: string): void => {
    onContainerClick?.(id);
  };

  return (
    <S.Wrapper $height={height}>
      {showLabels && (
        <S.Overlay>
          {containers.map((c) => (
            <S.Label key={c.id} $status={c.status}>
              {c.label}{" "}
              {c.telemetry?.soc !== undefined
                ? `%${Math.round(c.telemetry.soc)}`
                : ""}
            </S.Label>
          ))}
        </S.Overlay>
      )}

      <S.CanvasContainer>
        <Suspense fallback={<Placeholder height={height} />}>
          <Application fillMode={fillMode} resolutionMode="AUTO">
            <Entity name="camera">
              <Camera />
            </Entity>
            <Entity name="light" position={[0, 10, 10]}>
              <Light type="directional" />
            </Entity>
            {showGrid && (
              <Entity name="grid" position={[0, -0.01, 0]} scale={[20, 1, 20]}>
                <Render type="plane" />
              </Entity>
            )}
            {containers.map((c) => (
              <ContainerEntity
                key={c.id}
                container={c}
                selected={c.id === selectedContainerId}
                modelUrl={modelUrl}
                onClick={handleClick}
              />
            ))}
          </Application>
        </Suspense>
      </S.CanvasContainer>
    </S.Wrapper>
  );
};
