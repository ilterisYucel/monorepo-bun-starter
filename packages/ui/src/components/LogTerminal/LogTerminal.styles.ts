// packages/ui/src/components/LogTerminal/LogTerminal.styles.ts
import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const Header = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: ${COLORS.bgCard};
  border-bottom: 1px solid ${COLORS.borderDefault};
`;

export const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${COLORS.textPrimary};
`;

export const ClearBtn = styled.button`
  background: ${COLORS.errorAlpha12};
  border: 1px solid ${COLORS.errorAlpha25};
  color: ${COLORS.error};
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: ${COLORS.errorAlpha19};
    border-color: ${COLORS.errorAlpha50};
  }
`;

export const ScrollContainer = styled.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 8px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: ${COLORS.bgCard}; }
  &::-webkit-scrollbar-thumb {
    background: ${COLORS.info};
    border-radius: 4px;
  }
`;

export const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 150px;
  color: ${COLORS.textDisabled};
  gap: 8px;
  padding: 32px;
  text-align: center;
`;

export const EmptyIcon = styled.span`
  font-size: 48px;
  opacity: 0.5;
`;

export const EmptyText = styled.p`
  margin: 0;
  font-size: 14px;
`;

export const EmptySmall = styled.small`
  font-size: 11px;
`;

export const Entry = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 6px;
  border-radius: 8px;
  font-size: 12px;
  background: ${COLORS.bgCard};
  border-left: 3px solid transparent;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.bgPopup};
    transform: translateX(2px);
  }
`;

export const EntrySuccess = styled(Entry)`
  border-left-color: ${COLORS.success};

  & .log-icon { color: ${COLORS.success}; }
`;

export const EntryError = styled(Entry)`
  border-left-color: ${COLORS.error};

  & .log-icon { color: ${COLORS.error}; }
`;

export const EntryWarning = styled(Entry)`
  border-left-color: ${COLORS.warning};

  & .log-icon { color: ${COLORS.warning}; }
`;

export const EntryInfo = styled(Entry)`
  border-left-color: ${COLORS.info};

  & .log-icon { color: ${COLORS.info}; }
`;

export const Time = styled.div`
  font-size: 10px;
  color: ${COLORS.textDisabled};
  min-width: 65px;
  font-family: monospace;
  flex-shrink: 0;
`;

export const Icon = styled.div`
  min-width: 45px;
  font-size: 12px;
  flex-shrink: 0;
`;

export const Message = styled.div`
  flex: 1;
  color: ${COLORS.textPrimary};
  word-break: break-word;
`;

export const Details = styled.div`
  font-size: 10px;
  color: ${COLORS.textDisabled};
  margin-top: 4px;
  padding-left: 8px;
  border-left: 1px solid ${COLORS.borderDefault};
`;

export const Footer = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: ${COLORS.bgCard};
  border-top: 1px solid ${COLORS.borderDefault};
  font-size: 10px;
  color: ${COLORS.textDisabled};
`;

export const Legend = styled.div`
  display: flex;
  gap: 12px;
`;

export const LegendSuccess = styled.span`color: ${COLORS.success};`;
export const LegendError = styled.span`color: ${COLORS.error};`;
export const LegendWarning = styled.span`color: ${COLORS.warning};`;
export const LegendInfo = styled.span`color: ${COLORS.info};`;
