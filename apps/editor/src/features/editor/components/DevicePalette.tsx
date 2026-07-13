import React, { useCallback } from "react";
import styled from "@emotion/styled";
import { SCADA_ICONS, COLORS } from "@gd-monorepo/ui";
import { DEVICE_LIBRARY, DEVICE_TYPES, type DeviceType } from "@gd-monorepo/device-library";

const Container = styled.div`
  width: 220px;
  background: #1a1d27;
  border-right: 1px solid #2e303a;
  padding: 12px;
  overflow-y: auto;
  flex-shrink: 0;
`;

const Title = styled.h3`
  color: ${COLORS.textWhite};
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 12px 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const DeviceItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #0f1117;
  border: 1px solid #2e303a;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: grab;
  transition: border-color 0.15s, background 0.15s;

  &:hover {
    border-color: ${COLORS.success};
    background: #1a1d27;
  }

  &:active {
    cursor: grabbing;
  }
`;

const DeviceIcon = styled.div`
  color: ${COLORS.success};
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const DeviceLabel = styled.span`
  color: ${COLORS.textWhite};
  font-size: 13px;
  font-weight: 500;
`;

const CategoryLabel = styled.div`
  color: ${COLORS.textMuted};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin: 12px 0 6px 0;

  &:first-of-type {
    margin-top: 0;
  }
`;

const iconMap: Record<string, React.ReactNode> = {};

interface DevicePaletteProps {
  onDragStart?: (deviceType: DeviceType) => void;
}

export const DevicePalette: React.FC<DevicePaletteProps> = ({ onDragStart }) => {
  const handleDragStart = useCallback(
    (event: React.DragEvent, deviceType: DeviceType) => {
      event.dataTransfer.setData("application/scada-device", deviceType);
      event.dataTransfer.effectAllowed = "move";
      onDragStart?.(deviceType);
    },
    [onDragStart],
  );

  const categories = new Map<string, DeviceType[]>();
  for (const type of DEVICE_TYPES) {
    const def = DEVICE_LIBRARY[type];
    const category = def.category;
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category)!.push(type);
  }

  return (
    <Container>
      <Title>Cihazlar</Title>
      {Array.from(categories.entries()).map(([category, types]) => (
        <div key={category}>
          <CategoryLabel>{category}</CategoryLabel>
          {types.map((deviceType) => {
            const def = DEVICE_LIBRARY[deviceType];
            const IconComponent = SCADA_ICONS[def.icon];
            return (
              <DeviceItem
                key={deviceType}
                draggable
                onDragStart={(e) => handleDragStart(e, deviceType)}
              >
                <DeviceIcon>
                  <IconComponent size={18} />
                </DeviceIcon>
                <DeviceLabel>{def.displayName}</DeviceLabel>
              </DeviceItem>
            );
          })}
        </div>
      ))}
    </Container>
  );
};
