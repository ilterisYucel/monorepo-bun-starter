import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { COLORS } from "@gd-monorepo/ui";

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

export const RacksPageContainer = styled.div`
  padding: 8px;
`;

export const RackGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const ChartContainer = styled.div`
  background: ${COLORS.bgCard};
  border-radius: 20px;
  border: 1px solid ${COLORS.borderDefault};
  overflow: hidden;
  padding: 20px;
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
