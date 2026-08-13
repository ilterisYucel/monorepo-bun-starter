import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { COLORS } from "@gd-monorepo/ui";

const spin = keyframes`to { transform: rotate(360deg); }`;

export const PageContainer = styled.div`padding: 2px;`;

export const LoadingContainer = styled.div`
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 400px; color: ${COLORS.textMuted}; gap: 12px;
`;

export const Spinner = styled.div`
  width: 40px; height: 40px; border: 3px solid ${COLORS.borderDefault};
  border-top-color: ${COLORS.info}; border-radius: 50%; animation: ${spin} 1s linear infinite;
`;

export const TwoColumnLayout = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

export const Column = styled.div`
  display: flex; flex-direction: column; gap: 16px;
`;

export const Summary2x2 = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
`;

export const ChartRow = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

export const UnifiedChartWrap = styled.div`margin-bottom: 32px;`;

export const RackGrid = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
`;
