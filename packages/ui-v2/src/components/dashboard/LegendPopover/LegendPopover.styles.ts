import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";

export const Popover = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 250px;
  padding: 12px 14px;
  border-radius: ${RADIUS.lg}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 28px rgba(15, 26, 51, 0.16);
`;

export const SectionTitle = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const Divider = styled.span`
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
`;

export const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const Marker = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  flex: none;
`;

export const Dot = styled.span<{ $tone: "success" | "warning" | "critical" }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ theme, $tone }) => theme.colors[$tone]};
`;

export const OfflineDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  border: 2px solid ${({ theme }) => theme.colors.diagramMutedStrong};
  box-sizing: border-box;
`;

export const Line = styled.span<{ $tone: "warning" | "critical" | "info" }>`
  width: 16px;
  height: 3px;
  border-radius: 9px;
  background: ${({ theme, $tone }) => theme.colors[$tone]};
`;

export const Breaker = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.lineDiagram};
`;
