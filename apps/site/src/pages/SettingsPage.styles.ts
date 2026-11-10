import styled from "@emotion/styled";
import { COLORS } from "@gd-monorepo/ui";

export const Page = styled.div`
  max-width: 640px;
`;

export const Section = styled.div`
  background: ${COLORS.bgCard};
  border: 1px solid ${COLORS.borderDefault};
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 14px;
`;

export const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${COLORS.textMuted};
  margin-bottom: 12px;
`;

export const ToggleGroup = styled.div`
  display: flex;
  gap: 8px;
`;

export const ToggleBtn = styled.button<{ active: boolean }>`
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid
    ${(props) => (props.active ? COLORS.info : COLORS.borderDefault)};
  background: ${(props) => (props.active ? COLORS.infoAlpha12 : COLORS.bgInput)};
  color: ${(props) => (props.active ? COLORS.info : COLORS.textMuted)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${COLORS.info};
  }
`;

export const ComingSoon = styled.div`
  font-size: 11px;
  color: COLORS.textDisabled;
  margin-top: 10px;
`;
