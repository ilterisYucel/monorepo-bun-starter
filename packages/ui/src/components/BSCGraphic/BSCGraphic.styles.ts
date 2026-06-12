import styled from "@emotion/styled";

export const Container = styled.div`
  background: #1f1f2e;
  border-radius: 16px;
  border: 1px solid #2a2a3a;
  overflow: hidden;
  padding: 8px 12px;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  padding: 0 4px;
`;

export const DeviceId = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #e5e7eb;
  font-family: monospace;
`;

export const StatusIndicator = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: ${(props) =>
    props.$status === "Charge"
      ? "#10b98120"
      : props.$status === "Discharge"
        ? "#f59e0b20"
        : "#6b728020"};
  font-size: 14px;
`;

export const CanvasWrapper = styled.div`
  position: relative;
  width: 100%;
  canvas {
    width: 100%;
    height: auto;
    border-radius: 12px;
  }
`;

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
  padding: 0 4px;
`;

export const OutputStatus = styled.div<{ $isActive: boolean }>`
  font-size: 10px;
  font-family: monospace;
  color: ${(props) => (props.$isActive ? "#3b82f6" : "#6b7280")};
  background: #0f0f1a;
  padding: 4px 8px;
  border-radius: 6px;
`;

export const Loading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
`;
