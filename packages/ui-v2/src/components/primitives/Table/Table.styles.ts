import styled from "@emotion/styled";
import { TYPE } from "../../../typography";
import type { TableColumn } from "./Table.types";

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${TYPE.body.fontSize}px;
  line-height: ${TYPE.body.lineHeight}px;
  font-weight: ${TYPE.body.fontWeight};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const HeadCell = styled.th<{ $width?: TableColumn["width"]; $align: string }>`
  padding: 8px 12px;
  width: ${({ $width }) => (typeof $width === "number" ? `${$width}px` : ($width ?? "auto"))};
  text-align: ${({ $align }) => $align};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${TYPE.micro.fontSize}px;
  line-height: ${TYPE.micro.lineHeight}px;
  font-weight: ${TYPE.micro.fontWeight};
  letter-spacing: ${TYPE.micro.letterSpacing}px;
  text-transform: uppercase;
  white-space: nowrap;
`;

export const BodyRow = styled.tr<{ $dense: boolean }>`
  height: ${({ $dense }) => ($dense ? 30 : 34)}px;

  &:last-of-type td {
    border-bottom: none;
  }
`;

export const BodyCell = styled.td<{ $align: string }>`
  padding: 0 12px;
  text-align: ${({ $align }) => $align};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;
