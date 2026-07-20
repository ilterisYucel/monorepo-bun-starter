import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const ManeuverGrid = styled.div`
  column-count: 4;
  column-gap: 16px;

  @media (max-width: 1400px) {
    column-count: 3;
  }

  @media (max-width: 1024px) {
    column-count: 2;
  }

  @media (max-width: 640px) {
    column-count: 1;
  }
`;

export const ManeuverCardWrapper = styled.div`
  break-inside: avoid;
  margin-bottom: 16px;
`;
