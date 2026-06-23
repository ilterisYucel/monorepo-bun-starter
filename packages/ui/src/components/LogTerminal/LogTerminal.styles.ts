// packages/ui/src/components/LogTerminal/LogTerminal.styles.ts
import styled from "@emotion/styled";

export const Header = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1a1a2e;
  border-bottom: 1px solid #2a2a3a;
`;

export const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #e5e7eb;
`;

export const ClearBtn = styled.button`
  background: #ef444420;
  border: 1px solid #ef444640;
  color: #ef4444;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: #ef444430;
    border-color: #ef444480;
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
  &::-webkit-scrollbar-track { background: #1a1a2e; }
  &::-webkit-scrollbar-thumb {
    background: #3b82f6;
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
  color: #6b7280;
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
  background: #1a1a2e;
  border-left: 3px solid transparent;
  transition: all 0.2s;

  &:hover {
    background: #1f1f2e;
    transform: translateX(2px);
  }
`;

export const EntrySuccess = styled(Entry)`
  border-left-color: #10b981;

  & .log-icon { color: #10b981; }
`;

export const EntryError = styled(Entry)`
  border-left-color: #ef4444;

  & .log-icon { color: #ef4444; }
`;

export const EntryWarning = styled(Entry)`
  border-left-color: #f59e0b;

  & .log-icon { color: #f59e0b; }
`;

export const EntryInfo = styled(Entry)`
  border-left-color: #3b82f6;

  & .log-icon { color: #3b82f6; }
`;

export const Time = styled.div`
  font-size: 10px;
  color: #6b7280;
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
  color: #e5e7eb;
  word-break: break-word;
`;

export const Details = styled.div`
  font-size: 10px;
  color: #6b7280;
  margin-top: 4px;
  padding-left: 8px;
  border-left: 1px solid #2a2a3a;
`;

export const Footer = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1a1a2e;
  border-top: 1px solid #2a2a3a;
  font-size: 10px;
  color: #6b7280;
`;

export const Legend = styled.div`
  display: flex;
  gap: 12px;
`;

export const LegendSuccess = styled.span`color: #10b981;`;
export const LegendError = styled.span`color: #ef4444;`;
export const LegendWarning = styled.span`color: #f59e0b;`;
export const LegendInfo = styled.span`color: #3b82f6;`;
