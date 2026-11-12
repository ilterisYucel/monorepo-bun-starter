import styled from "@emotion/styled";
import { COMPACT } from "../../../typography";

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
`;

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

export const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.title.fontSize}px;
  line-height: ${COMPACT.title.lineHeight}px;
  font-weight: 600;
`;

export const Subtitle = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const Pills = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;
