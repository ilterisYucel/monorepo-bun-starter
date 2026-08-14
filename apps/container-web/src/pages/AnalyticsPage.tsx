import React from "react";
import styled from "@emotion/styled";
import { COLORS, SCADA_ICONS, useTranslation } from "@gd-monorepo/ui";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: ${COLORS.textDisabled};
  gap: 16px;
`;

const Icon = styled.div`
  opacity: 0.4;
`;

const Text = styled.p`
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: ${COLORS.textMuted};
`;

const SubText = styled.p`
  font-size: 13px;
  margin: 0;
  color: ${COLORS.textDisabled};
`;

export const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const AnalyticsIcon = SCADA_ICONS.analytics;

  return (
    <Container>
      <Icon>
        <AnalyticsIcon size={64} />
      </Icon>
      <Text>{t("common.underConstruction")}</Text>
      <SubText>Bu sayfa ileride analitik amaçlarla kullanılacaktır.</SubText>
    </Container>
  );
};

AnalyticsPage.displayName = "AnalyticsPage";
