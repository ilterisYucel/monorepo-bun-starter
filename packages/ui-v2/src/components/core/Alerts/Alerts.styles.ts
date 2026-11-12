import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";
import type { AlertSeverity } from "./Alerts.types";

export const TONE: Record<AlertSeverity, "critical" | "warning" | "info" | "maint"> = {
  critical: "critical",
  warning: "warning",
  info: "info",
  cold: "info",
  maint: "maint",
};

export const Panel = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 572px;
  padding: 14px;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const Title = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 13px;
  line-height: 15.6px;
  font-weight: 600;
`;

export const HeadChips = styled.div`
  display: flex;
  gap: 6px;
`;

export const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const FilterChip = styled.span<{ $severity?: AlertSeverity }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 19px;
  padding: 2px 8px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme, $severity }) =>
    $severity ? theme.colors.surface : theme.colors.inverse};
  border: ${({ theme, $severity }) => ($severity ? `1px solid ${theme.colors.border}` : "none")};
  color: ${({ theme, $severity }) =>
    $severity ? theme.colors[`${TONE[$severity]}Text`] : theme.colors.textOnDark};
  font-size: ${COMPACT.small.fontSize}px;
  line-height: ${COMPACT.small.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

export const FilterDot = styled.span<{ $severity: AlertSeverity }>`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: ${({ theme, $severity }) => theme.colors[TONE[$severity]]};
`;

export const List = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  overflow: hidden;
`;

export const Row = styled.div<{ $severity: AlertSeverity }>`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 43px;
  padding: 7px 8px 7px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $severity }) =>
    $severity === "critical" ? theme.colors.criticalTintSoft : theme.colors.surface};

  &:last-of-type {
    border-bottom: none;
  }
`;

export const Stripe = styled.span<{ $severity: AlertSeverity }>`
  align-self: stretch;
  width: 3px;
  background: ${({ theme, $severity }) => theme.colors[TONE[$severity]]};
`;

export const RowTime = styled.span`
  width: 62px;
  padding-left: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 400;
`;

export const RowSource = styled.span`
  width: 96px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: ${COMPACT.label.fontWeight};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RowMessage = styled.span`
  flex: 1;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RowStatus = styled.span`
  width: 46px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
  text-align: right;
`;

export const Group = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 8px;

  &:last-of-type {
    margin-bottom: 0;
  }
`;

export const GroupHead = styled.div<{ $severity: AlertSeverity }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: ${({ theme, $severity }) => theme.colors[`${TONE[$severity]}Tint`]};
  color: ${({ theme, $severity }) => theme.colors[`${TONE[$severity]}Text`]};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
  text-transform: uppercase;
`;

export const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

export const AlertCard = styled.div<{ $severity: AlertSeverity }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-left: 3px solid ${({ theme, $severity }) => theme.colors[TONE[$severity]]};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bgPage};
`;

export const Foot = styled.div`
  color: ${({ theme }) => theme.colors.infoText};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;
