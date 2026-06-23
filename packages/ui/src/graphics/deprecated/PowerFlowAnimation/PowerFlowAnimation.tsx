// packages/ui/src/components/PowerFlowAnimation/PowerFlowAnimation.tsx
import React from "react";
import { PowerFlowCanvas } from "./PowerFlowCanvas";
import * as S from "./PowerFlowAnimation.styles";
import type { PowerFlowAnimationProps } from "./PowerFlowAnimation.types";

export const PowerFlowAnimation: React.FC<PowerFlowAnimationProps> = ({
  flowDirection,
  racks,
  height = 200,
}) => {
  const getFlowStatusComponent = () => {
    switch (flowDirection) {
      case "Charge":
        return S.FlowStatusCharge;
      case "Discharge":
        return S.FlowStatusDischarge;
      default:
        return S.FlowStatusIdle;
    }
  };

  const getFlowStatusText = () => {
    switch (flowDirection) {
      case "Charge":
        return "ŞARJ AKTİF (Grid → Batarya)";
      case "Discharge":
        return "DEŞARJ AKTİF (Batarya → Grid)";
      default:
        return "BEKLEME MODU";
    }
  };

  const FlowStatusComponent = getFlowStatusComponent();

  return (
    <S.Container>
      <S.Header>
        <S.Title>🔋 Enerji Akış Şeması</S.Title>
        <FlowStatusComponent>{getFlowStatusText()}</FlowStatusComponent>
      </S.Header>
      <PowerFlowCanvas
        flowDirection={flowDirection}
        racks={racks}
        width={680}
        height={height}
      />
      <S.Legend>
        <S.LegendItem>
          <S.LegendBattery />
          <span>Batarya Grupları (Her biri 1 Rack)</span>
        </S.LegendItem>
        <S.LegendItem>
          <S.LegendSwitch />
          <span>Devre Anahtarı</span>
        </S.LegendItem>
        <S.LegendItem>
          <S.LegendGrid />
          <span>Şebeke (Grid)</span>
        </S.LegendItem>
        <S.LegendItem>
          <S.LegendFlowCharge />
          <span>Şarj Akışı (Yeşil)</span>
        </S.LegendItem>
        <S.LegendItem>
          <S.LegendFlowDischarge />
          <span>Deşarj Akışı (Turuncu)</span>
        </S.LegendItem>
        <S.LegendItem>
          <S.LegendClick />
          <span>🔍 Rack'e Tıkla → Detay</span>
        </S.LegendItem>
      </S.Legend>
    </S.Container>
  );
};
