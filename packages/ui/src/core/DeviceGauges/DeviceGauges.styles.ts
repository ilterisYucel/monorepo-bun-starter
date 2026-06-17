import styled from "@emotion/styled";

export const Wrapper = styled.div`
  background: transparent;
`;

export const Header = styled.div`
  text-align: left;
  color: #9ca3af;
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 10px;
`;

export const Grid = styled.div<{ $gap: number }>`
  display: flex;
  flex-wrap: nowrap;
  gap: ${({ $gap }) => $gap}px;
`;

export const Cell = styled.div`
  flex: 1 1 0%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  /* TelemetryGauge'nin fix min-width'ini container'a uydur */
  & > * {
    width: 100% !important;
    min-width: 0 !important;
  }
`;
