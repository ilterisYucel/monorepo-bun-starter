import styled from "@emotion/styled";

export const EventsPageContainer = styled.div`
  padding: 8px;
`;

export const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  overflow-x: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const EventsCard = styled.div`
  background: #1a1a2e;
  border-radius: 20px;
  border: 1px solid #2a2a3a;
  overflow: hidden;

  h3 {
    padding: 16px 20px;
    margin: 0;
    background: #0f0f1a;
    border-bottom: 1px solid #2a2a3a;
    color: #e5e7eb;
    font-size: 14px;
    font-weight: 600;
  }
`;
