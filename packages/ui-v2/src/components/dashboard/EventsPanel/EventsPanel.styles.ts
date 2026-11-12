import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";
import type { AlertSeverity } from "../../core/Alerts";

const TONE_TOKEN: Record<AlertSeverity, "critical" | "warning" | "info" | "maint"> = {
  critical: "critical",
  warning: "warning",
  info: "info",
  cold: "info",
  maint: "maint",
};

const VALUE_TOKEN = {
  default: "textPrimary",
  success: "successText",
  warning: "warningText",
  critical: "criticalText",
} as const;

export const LogCard = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 16px;
  border-radius: ${RADIUS.xl}px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const LogHead = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.heading.fontSize}px;
  line-height: ${COMPACT.heading.lineHeight}px;
  font-weight: 600;
`;

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const SearchWrap = styled.label`
  display: flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 6px 10px;
  margin-left: auto;
  border-radius: ${RADIUS.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
  box-sizing: border-box;
`;

export const SearchInput = styled.input`
  width: 160px;
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: inherit;
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`;

export const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 6px 10px;
  border-radius: ${RADIUS.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.info};
    outline-offset: 2px;
  }
`;

export const TableHead = styled.div`
  display: flex;
  gap: 10px;
  padding: 0 12px 8px 15px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.micro.fontSize}px;
  line-height: ${COMPACT.micro.lineHeight}px;
  font-weight: 700;
  letter-spacing: ${COMPACT.micro.letterSpacing}px;
  text-transform: uppercase;
`;

export const ColTime = styled.span`
  width: 118px;
`;

export const ColSeverity = styled.span`
  width: 84px;
`;

export const ColSource = styled.span`
  width: 154px;
`;

export const ColMessage = styled.span`
  flex: 1;
`;

export const ColStatus = styled.span`
  width: 86px;
  text-align: right;
`;

export const Row = styled.div<{ $severity: AlertSeverity }>`
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.bgPage};
  padding-left: 0;

  &::before {
    content: "";
    align-self: stretch;
    width: 3px;
    background: ${({ theme, $severity }) => theme.colors[TONE_TOKEN[$severity]]};
  }
`;

export const Cell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 0 12px;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const Time = styled.span`
  width: 118px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 400;
  white-space: nowrap;
`;

export const BadgeWrap = styled.span`
  width: 84px;
`;

export const Source = styled.span`
  width: 154px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
`;

export const Message = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
`;

export const Status = styled.span<{ $active: boolean }>`
  width: 86px;
  text-align: right;
  color: ${({ theme, $active }) => ($active ? theme.colors.successText : theme.colors.textTertiary)};
  font-weight: 500;
`;

// ---- String states ----

export const StatesWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 293px;
`;

export const StateCard = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 13px 16px;
  border-radius: ${RADIUS.xl}px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const StateHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const StateTitle = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const StateRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 27px;
  padding: 5px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-of-type {
    border-bottom: none;
  }
`;

export const StateLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const StateValue = styled.span<{ $tone: keyof typeof VALUE_TOKEN }>`
  color: ${({ theme, $tone }) => theme.colors[VALUE_TOKEN[$tone]]};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;
