import styled from "@emotion/styled";

export const Container = styled.div`
  background: #1a1a2e;
  overflow: hidden;
  width: 100%;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #0f0f1a;
  border-bottom: 1px solid #2a2a3a;
  min-height: 44px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DeviceLabel = styled.span`
  font-family: monospace;
  font-size: 14px;
  font-weight: 700;
  color: #e5e7eb;
`;

export const FlowBadge = styled.span<{ $status: string }>`
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  color: ${({ $status }) =>
    $status === "Charge" ? "#10b981" : $status === "Discharge" ? "#f59e0b" : "#6b7280"};
  background: ${({ $status }) =>
    $status === "Charge" ? "#10b98120" : $status === "Discharge" ? "#f59e0b20" : "#6b728020"};
`;

export const BSCLabel = styled.span`
  font-family: monospace;
  font-size: 11px;
  color: #9ca3af;
`;

export const ZoomButton = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => ($active ? "#3b82f620" : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? "#3b82f640" : "transparent")};
  border-radius: 6px;
  padding: 4px;
  cursor: pointer;
  color: ${({ $active }) => ($active ? "#3b82f6" : "#9ca3af")};
  display: flex;
  align-items: center;
  transition: all 0.15s ease;

  &:hover {
    color: #3b82f6;
    background: #3b82f618;
  }
`;

export const IconBtn = styled.button`
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 4px;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  transition: all 0.15s ease;

  &:hover {
    color: #3b82f6;
    background: #3b82f618;
  }
`;

export const CanvasWrap = styled.div`
  width: 100%;
  overflow: hidden;
  cursor: default;
`;

export const Loading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
  font-size: 14px;
`;
