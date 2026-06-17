// packages/ui/src/components/RackCard/RackCard.styles.ts
import styled from "@emotion/styled";

export const Card = styled.div`
  background: #1a1a2e;
  border: 1px solid #2a2a3a;
  border-radius: 20px;
  padding: 20px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  cursor: pointer;

  @media (max-width: 480px) {
    padding: 16px;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: #3b82f6;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 480px) {
    flex-wrap: wrap;
  }
`;

export const Name = styled.span`
  font-weight: 700;
  color: #e5e7eb;
  font-size: 18px;
  letter-spacing: 0.5px;
`;

export const Badges = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 480px) {
    flex-wrap: wrap;
  }
`;

export const BadgeOnline = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #10b98120;
  color: #10b981;
  border: 1px solid #10b981;
`;

export const BadgeOffline = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ef444420;
  color: #ef4444;
  border: 1px solid #ef4444;
`;

export const BadgeCharge = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #10b98120;
  color: #10b981;
  border: 1px solid #10b981;
`;

export const BadgeDischarge = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f59e0b20;
  color: #f59e0b;
  border: 1px solid #f59e0b;
`;

export const BadgeIdle = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #6b728020;
  color: #9ca3af;
  border: 1px solid #6b7280;
`;

export const SocContainer = styled.div`
  text-align: center;
  margin-bottom: 24px;
  padding: 16px;
  background: #0f0f1a;
  border-radius: 16px;
`;

export const SocValue = styled.div`
  font-size: 48px;
  font-weight: 800;
  color: #3b82f6;
  line-height: 1;
  margin-bottom: 8px;

  @media (max-width: 480px) {
    font-size: 36px;
  }
`;

export const SocLabel = styled.div`
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 12px;
`;

export const SocBar = styled.div`
  height: 8px;
  background: #2a2a3a;
  border-radius: 4px;
  overflow: hidden;
`;

export const SocBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

export const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f0f1a;
  padding: 10px 12px;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    background: #1f1f2e;
    transform: translateX(2px);
  }
`;

export const DetailIcon = styled.span`
  font-size: 16px;
  min-width: 28px;
`;

export const DetailLabel = styled.span`
  font-size: 11px;
  color: #9ca3af;
  flex: 1;
`;

export const DetailValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #e5e7eb;
`;

export const DetailButton = styled.button`
  margin-top: 12px;
  width: 100%;
  padding: 10px 0;
  background: #1f1f2e;
  border: 1px solid #2a2a3a;
  border-radius: 10px;
  color: #d1d5db;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #252535;
    border-color: #3b82f6;
    color: #3b82f6;
  }
`;
