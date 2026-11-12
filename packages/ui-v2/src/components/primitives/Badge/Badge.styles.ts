import styled from "@emotion/styled";
import { RADIUS } from "../../../system";
import { TYPE } from "../../../typography";
import type { BadgeTone } from "./Badge.types";

const BG_TOKEN = {
  success: "successTint",
  warning: "warningTint",
  critical: "criticalTint",
  info: "infoTint",
  maint: "maintTint",
  neutral: "bgPage",
} as const;

const TEXT_TOKEN = {
  success: "successText",
  warning: "warningText",
  critical: "criticalText",
  info: "infoText",
  maint: "maintText",
  neutral: "textSecondary",
} as const;

export const BadgeBox = styled.span<{ $tone: BadgeTone; $uppercase: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 8px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme, $tone }) => theme.colors[BG_TOKEN[$tone]]};
  color: ${({ theme, $tone }) => theme.colors[TEXT_TOKEN[$tone]]};
  font-size: ${TYPE.badge.fontSize}px;
  line-height: ${TYPE.badge.lineHeight}px;
  font-weight: ${TYPE.badge.fontWeight};
  letter-spacing: ${TYPE.badge.letterSpacing}px;
  text-transform: ${({ $uppercase }) => ($uppercase ? "uppercase" : "none")};
  white-space: nowrap;
`;

export const CountBox = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  min-width: 16px;
  padding: 0 5px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme }) => theme.colors.critical};
  color: ${({ theme }) => theme.colors.textOnSolid};
  font-size: ${TYPE.badge.fontSize}px;
  line-height: ${TYPE.badge.lineHeight}px;
  font-weight: ${TYPE.badge.fontWeight};
`;
