import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { COMPACT } from "../../../typography";
import type { DcRowTone } from "./DcSections.types";

const VALUE_TOKEN: Record<DcRowTone, "textPrimary" | "successText" | "warningText" | "criticalText"> = {
  default: "textPrimary",
  success: "successText",
  warning: "warningText",
  critical: "criticalText",
};

export const Grid = styled.div`
  display: flex;
  gap: 12px;
  width: 100%;
`;

export const Card = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 14px 16px 12px;
  border-radius: ${RADIUS.xl}px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`;

export const Title = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.heading.fontSize}px;
  line-height: ${COMPACT.heading.lineHeight}px;
  font-weight: 600;
`;

export const Subtitle = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
`;

export const Rows = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 27px;
  padding: 5px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-of-type {
    border-bottom: none;
  }
`;

export const Label = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const Value = styled.span<{ $tone: DcRowTone }>`
  color: ${({ theme, $tone }) => theme.colors[VALUE_TOKEN[$tone]]};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
  text-align: right;
`;

export const Foot = styled.p`
  margin: auto 0 0;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;
