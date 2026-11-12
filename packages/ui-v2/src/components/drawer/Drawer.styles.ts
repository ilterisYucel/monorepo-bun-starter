import styled from "@emotion/styled";
import { ELEVATION, RADIUS } from "../../system";
import { COMPACT } from "../../typography";

export const Drawer = styled.aside`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 480px;
  padding: 16px;
  border-radius: ${RADIUS.xl}px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${ELEVATION.drawer};
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.title.fontSize}px;
  line-height: ${COMPACT.title.lineHeight}px;
  font-weight: 600;
`;

export const Spacer = styled.span`
  flex: 1;
`;

export const Feeder = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
`;

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: ${RADIUS.pill}px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
  white-space: nowrap;
`;

export const Emergency = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 7px 12px;
  margin-left: auto;
  border: none;
  border-radius: ${RADIUS.md}px;
  background: ${({ theme }) => theme.colors.critical};
  color: ${({ theme }) => theme.colors.textOnSolid};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: 16px;
  font-weight: 600;
  cursor: pointer;
`;

export const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  max-height: 60vh;
`;

export const Section = styled.section`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: ${RADIUS.lg}px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const SectionTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

export const Caption = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

export const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const StatLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 500;
`;

export const StatValue = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const CmaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
`;

export const CmaColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const CmaTitle = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
`;

export const CmaCells = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
`;

export const Cell = styled.span<{ $tone: "normal" | "warning" | "critical" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 18px;
  border-radius: 2px;
  background: ${({ theme, $tone }) =>
    $tone === "critical"
      ? theme.colors.criticalTint
      : $tone === "warning"
        ? theme.colors.warningTint
        : theme.colors.successTint};
  color: ${({ theme, $tone }) =>
    $tone === "critical"
      ? theme.colors.criticalText
      : $tone === "warning"
        ? theme.colors.warningText
        : theme.colors.successText};
  font-size: 7px;
  line-height: 9px;
  font-weight: 600;
`;

export const PosRow = styled.div`
  display: flex;
  gap: 8px;
`;

export const PosCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bgPage};
`;

export const PosName = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.caption.fontSize}px;
  line-height: ${COMPACT.caption.lineHeight}px;
  font-weight: 600;
`;

export const PcsTable = styled.div`
  display: flex;
  flex-direction: column;
`;

export const PcsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-of-type {
    border-bottom: none;
  }
`;

export const PcsLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;

export const PcsValue = styled.span<{ $tone: "success" | "warning" | "critical" }>`
  color: ${({ theme, $tone }) => theme.colors[`${$tone}Text`]};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const BankGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`;

export const BankCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bgPage};
`;

export const BankTitle = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const BankValue = styled.span<{ $high: boolean }>`
  color: ${({ theme, $high }) => ($high ? theme.colors.warningText : theme.colors.textPrimary)};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 600;
`;

export const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const FooterNote = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: ${COMPACT.label.fontSize}px;
  line-height: ${COMPACT.label.lineHeight}px;
  font-weight: 500;
`;
