import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const MapWrapper = styled.div<{ $height: number | string }>`
  width: 100%;
  height: ${({ $height }) =>
    typeof $height === "number" ? `${$height}px` : $height};
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${COLORS.borderDefault};

  .leaflet-container {
    background: ${COLORS.bgApp};
    height: 100%;
    width: 100%;
  }

  .leaflet-control-zoom a {
    background: ${COLORS.bgCard} !important;
    color: ${COLORS.textPrimary} !important;
    border-color: ${COLORS.borderDefault} !important;
  }

  .leaflet-control-attribution {
    background: ${COLORS.bgCard} !important;
    color: ${COLORS.textMuted} !important;
    font-size: 10px !important;
  }

  .leaflet-popup-content-wrapper {
    background: ${COLORS.bgCard} !important;
    color: ${COLORS.textPrimary} !important;
    border-radius: 12px !important;
    border: 1px solid ${COLORS.borderDefault} !important;
  }

  .leaflet-popup-tip {
    background: ${COLORS.bgCard} !important;
  }

  .leaflet-popup-content {
    margin: 10px 14px !important;
    font-size: 12px !important;
    line-height: 1.6 !important;
  }

  .leaflet-tile-pane {
    filter: brightness(0.6) saturate(0.3);
  }
`;

export const PopupTitle = styled.div`
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 6px;
  color: ${COLORS.textWhite};
`;

export const PopupRow = styled.div`
  font-size: 11px;
  color: ${COLORS.textMuted};
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const PopupStatus = styled.span<{ $status: "online" | "warning" | "offline" }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: ${({ $status }) =>
    $status === "online"
      ? COLORS.success
      : $status === "warning"
        ? COLORS.warning
        : COLORS.error};
`;

export const PopupDot = styled.span<{ $status: "online" | "warning" | "offline" }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  background: ${({ $status }) =>
    $status === "online"
      ? COLORS.success
      : $status === "warning"
        ? COLORS.warning
        : COLORS.error};
`;
