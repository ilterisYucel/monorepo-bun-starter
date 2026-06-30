import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { COLORS } from "@gd-monorepo/ui";

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.15s ease;
`;

export const Modal = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${scaleIn} 0.15s ease;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${COLORS.borderDefault};
  flex-shrink: 0;
  gap: 12px;
`;

export const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

export const HeaderName = styled.span`
  font-weight: 700;
  font-size: 16px;
  color: ${COLORS.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const HeaderBadge = styled.span<{ $color: string; $bg: string }>`
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${(p) => p.$color};
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$color};
  white-space: nowrap;
  flex-shrink: 0;
`;

export const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${COLORS.textMuted};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    background: ${COLORS.bgHover};
    color: ${COLORS.textPrimary};
  }
`;

export const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid ${COLORS.borderDefault};
  flex-shrink: 0;
  padding: 0 20px;
  gap: 4px;
`;

export const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 16px;
  border: none;
  border-bottom: 2px solid ${(p) => (p.$active ? COLORS.info : "transparent")};
  background: transparent;
  color: ${(p) => (p.$active ? COLORS.info : COLORS.textMuted)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: ${COLORS.textPrimary};
  }
`;

export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${COLORS.borderDefault};
    border-radius: 3px;
  }
`;

export const Section = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${COLORS.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const Field = styled.div`
  background: ${COLORS.bgInput};
  border-radius: 10px;
  padding: 10px 12px;
`;

export const FieldLabel = styled.div`
  font-size: 11px;
  color: ${COLORS.textMuted};
  margin-bottom: 2px;
`;

export const FieldValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${COLORS.textPrimary};
`;

export const SoCGauge = styled.div`
  text-align: center;
  padding: 20px;
  background: ${COLORS.bgInput};
  border-radius: 14px;
  margin-bottom: 12px;
`;

export const GaugeValue = styled.div`
  font-size: 52px;
  font-weight: 800;
  color: ${COLORS.info};
  line-height: 1;
  margin-bottom: 4px;
`;

export const GaugeLabel = styled.div`
  font-size: 12px;
  color: ${COLORS.textMuted};
  margin-bottom: 14px;
`;

export const GaugeBar = styled.div`
  height: 8px;
  background: ${COLORS.borderDefault};
  border-radius: 4px;
  overflow: hidden;
`;

export const GaugeFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: linear-gradient(90deg, ${COLORS.info}, ${COLORS.success});
  border-radius: 4px;
  transition: width 0.3s ease;
`;

export const DiagnosticList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const DiagGroup = styled.div`
  background: ${COLORS.bgInput};
  border-radius: 10px;
  overflow: hidden;
`;

export const DiagGroupHeader = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${COLORS.textMuted};
  padding: 10px 12px 6px;
`;

export const DiagFlag = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: ${COLORS.textPrimary};

  &:last-child {
    padding-bottom: 10px;
  }
`;

export const DiagDot = styled.span<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$active ? COLORS.successGlow : COLORS.idle)};
  box-shadow: ${(p) => (p.$active ? `0 0 6px ${COLORS.successGlow}` : "none")};
  flex-shrink: 0;
`;

export const Empty = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: ${COLORS.textMuted};
  font-size: 13px;
`;
