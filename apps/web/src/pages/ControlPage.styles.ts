import styled from "@emotion/styled";

export const ControlPageContainer = styled.div`
  padding: 8px;
`;

export const ControlGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;
