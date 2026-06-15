import styled from "@emotion/styled";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  background: #1f1f2e;
  border-radius: 16px;
  border: 1px solid #2a2a3a;
  overflow: hidden;
`;

export const Loading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #1a1a2e;
  border-bottom: 1px solid #2a2a3a;
  flex-shrink: 0;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const DeviceLabel = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #e5e7eb;
  font-family: monospace;
`;

export const StatusBadge = styled.span<{ $status: string }>`
  font-size: 10px;
  font-weight: 700;
  font-family: monospace;
  padding: 2px 8px;
  border-radius: 4px;
  color: ${(props) =>
    props.$status === "online" ? "#10b981" : "#ef4444"};
  background: ${(props) =>
    props.$status === "online" ? "#10b98120" : "#ef444420"};
`;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid #3d3d5e;
  border-radius: 5px;
  background: #1f1f2e;
  color: #9ca3af;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #2a2a3e;
    color: #e5e7eb;
  }
`;
