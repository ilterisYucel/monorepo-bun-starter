import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const MapWrapper = styled.div<{ $height: number | string; $frameless?: boolean }>`
  width: 100%;
  height: ${({ $height }) =>
    typeof $height === "number" ? `${$height}px` : $height};
  border-radius: 14px;
  overflow: hidden;
  border: ${({ $frameless }) => ($frameless ? "none" : `1px solid ${COLORS.borderDefault}`)};

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
    background: transparent !important;
    color: ${COLORS.textPrimary} !important;
    border-radius: 14px !important;
    border: none !important;
    box-shadow: none !important;
  }

  .leaflet-popup-tip {
    background: transparent !important;
    box-shadow: none !important;
  }

  .leaflet-popup-content {
    margin: 6px !important;
    font-size: 12px !important;
    line-height: 1.6 !important;
  }

  .leaflet-tile-pane {
    filter: brightness(0.6) saturate(0.3);
  }
`;

export const PopupCard = styled.div`
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const DetailButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 30px;
  margin-top: 10px;
  background: ${COLORS.infoDark};
  border: none;
  border-radius: 8px;
  color: ${COLORS.textWhite};
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;

  &:hover {
    background: ${COLORS.infoHover};
  }
`;
