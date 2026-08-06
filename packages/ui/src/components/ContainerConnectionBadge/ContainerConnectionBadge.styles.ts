import styled from "@emotion/styled";
import { COLORS } from "../../colors";

export const Badge = styled.span<{ $connected: boolean; $size: "small" | "medium" }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => ($size === "small" ? "4px" : "6px")};
  padding: ${({ $size }) => ($size === "small" ? "2px 8px" : "4px 10px")};
  border-radius: 12px;
  font-size: ${({ $size }) => ($size === "small" ? "10px" : "12px")};
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid
    ${({ $connected }) => ($connected ? COLORS.success : COLORS.error)};
  color: ${({ $connected }) => ($connected ? COLORS.success : COLORS.error)};
  background: ${({ $connected }) =>
    $connected ? COLORS.successAlpha12 : COLORS.errorAlpha12};
  transition: all 0.3s ease;
`;

export const Dot = styled.span<{ $connected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $connected }) =>
    $connected ? COLORS.success : COLORS.error};
  box-shadow: 0 0 6px
    ${({ $connected }) => ($connected ? COLORS.successGlow : COLORS.error)};
`;
