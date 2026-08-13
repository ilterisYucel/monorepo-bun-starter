import styled from "@emotion/styled";
import { COLORS } from "../../colors";
import type { SummaryCardVariant } from "./SummaryCard.types";

const variantColors: Record<SummaryCardVariant, { border: string; bg: string; text: string }> = {
  ok:    { border: COLORS.success,         bg: COLORS.successAlpha12,  text: COLORS.success },
  alarm: { border: COLORS.error,           bg: COLORS.errorAlpha12,    text: COLORS.error },
  fault: { border: COLORS.warning,         bg: COLORS.warningAlpha12,  text: COLORS.warning },
  info:  { border: COLORS.info,            bg: COLORS.infoAlpha12,     text: COLORS.info },
  bsc:   { border: COLORS.success,         bg: COLORS.successAlpha12,  text: COLORS.success },
  cb:    { border: COLORS.info,            bg: COLORS.infoAlpha12,     text: COLORS.info },
  dc:    { border: COLORS.warning,         bg: COLORS.warningAlpha12,  text: COLORS.warning },
  hvac:  { border: COLORS.tempCold,        bg: COLORS.infoAlpha12,     text: COLORS.tempCold },
};

export const Container = styled.div<{ $variant: SummaryCardVariant }>`
  padding: 18px;
  border-radius: 14px;
  text-align: center;
  border: 2px solid ${({ $variant }) => variantColors[$variant].border};
  background: ${({ $variant }) => variantColors[$variant].bg};
  transition: all 0.3s ease;
`;

export const Icon = styled.div`
  font-size: 32px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
`;

export const Value = styled.div<{ $variant: SummaryCardVariant }>`
  font-size: 22px;
  font-weight: 800;
  color: ${({ $variant }) => variantColors[$variant].text};
`;

export const Label = styled.div<{ $variant: SummaryCardVariant }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $variant }) => variantColors[$variant].text};
`;
