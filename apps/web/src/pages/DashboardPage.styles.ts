import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { COLORS } from "@gd-monorepo/ui";

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export const DashboardPageContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const DashboardRow = styled.div`
  display: flex;
  gap: 24px;

  & > * {
    flex: 1;
    min-width: 0;
  }
`;

export const BscColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const TmsColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const DeviceGaugesStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: ${COLORS.textMuted};
`;

export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${COLORS.borderDefault};
  border-top-color: ${COLORS.info};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 12px;
`;

export const TerminalCard = styled.div`
  background: ${COLORS.bgCard};
  border-radius: 20px;
  border: 1px solid ${COLORS.borderDefault};
  overflow: hidden;

  h3 {
    padding: 16px 20px;
    margin: 0;
    background: ${COLORS.bgInput};
    border-bottom: 1px solid ${COLORS.borderDefault};
    color: ${COLORS.textPrimary};
    font-size: 14px;
    font-weight: 600;
  }
`;
