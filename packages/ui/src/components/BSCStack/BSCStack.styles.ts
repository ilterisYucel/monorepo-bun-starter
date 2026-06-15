import styled from "@emotion/styled";

export const Container = styled.div`
  background: #1a1a2e;
  border-radius: 16px;
  border: 1px solid #2a2a3a;
  overflow: hidden;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #1f1f2e;
  border-bottom: 1px solid #2a2a3a;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const DeviceLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #e5e7eb;
  font-family: monospace;
`;

export const FlowBadge = styled.span<{ $status: string }>`
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  padding: 2px 8px;
  border-radius: 4px;
  color: ${(props) =>
    props.$status === "Charge"
      ? "#10b981"
      : props.$status === "Discharge"
        ? "#f59e0b"
        : "#6b7280"};
  background: ${(props) =>
    props.$status === "Charge"
      ? "#10b98120"
      : props.$status === "Discharge"
        ? "#f59e0b20"
        : "#6b728020"};
`;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const BSCLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  font-family: monospace;
`;

export const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #3d3d5e;
  border-radius: 6px;
  background: #1a1a2e;
  color: #9ca3af;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #2a2a3e;
    color: #e5e7eb;
  }
`;
