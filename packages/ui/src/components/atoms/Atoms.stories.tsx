import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { SCADA_ICONS } from "../../icons";
import { COLORS } from "../../colors";
import { Card } from "./Card/Card";
import { CardGrid } from "./CardGrid/CardGrid";
import { CardHeader } from "./CardHeader/CardHeader";
import { ChartGrid } from "./ChartGrid/ChartGrid";
import { DataGrid } from "./DataGrid/DataGrid";
import { DataRow } from "./DataRow/DataRow";
import { MetricBar } from "./MetricBar/MetricBar";
import { MetricDisplay } from "./MetricDisplay/MetricDisplay";
import { SectionHeader } from "./SectionHeader/SectionHeader";
import { Online, Offline, Charge, Discharge, Idle } from "./StatusBadge/StatusBadge";

const meta: Meta = {
  title: "Components/Atoms",
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

const BadgeDemo: React.FC<{ Badge: React.ComponentType<{ children?: React.ReactNode }> }> = ({
  Badge,
}) => (
  <Badge>
    <span style={{ color: COLORS.textWhite }}>Durum</span>
  </Badge>
);

export const CardAtom: Story = {
  render: () => (
    <Card>
      <CardHeader name="Kart Başlığı" />
      <div style={{ padding: 12, color: COLORS.textPrimary }}>
        <DataGrid>
          <DataRow icon={<SCADA_ICONS.dashboard size={14} />} label="Voltaj" value="48.2 V" />
          <DataRow icon={<SCADA_ICONS.dashboard size={14} />} label="Akım" value="6.1 A" />
          <DataRow icon={<SCADA_ICONS.dashboard size={14} />} label="Güç" value="0.3 kW" />
          <DataRow icon={<SCADA_ICONS.dashboard size={14} />} label="Sıcaklık" value="28 °C" />
        </DataGrid>
        <MetricDisplay value={85} label="SoC" formattedValue="%85" />
        <MetricBar value={85} />
      </div>
    </Card>
  ),
};

export const CardGridAtom: Story = {
  render: () => (
    <CardGrid>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader name={`Kart ${i}`} />
          <div style={{ padding: 12, color: COLORS.textPrimary }}>
            <MetricDisplay value={i * 20} label="Değer" formattedValue={`${i * 20}`} />
            <MetricBar value={i * 20} />
          </div>
        </Card>
      ))}
    </CardGrid>
  ),
};

export const ChartGridAtom: Story = {
  render: () => (
    <ChartGrid>
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader name={`Grafik ${i}`} />
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted }}>
            Grafik alanı
          </div>
        </Card>
      ))}
    </ChartGrid>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <BadgeDemo Badge={Online} />
      <BadgeDemo Badge={Offline} />
      <BadgeDemo Badge={Charge} />
      <BadgeDemo Badge={Discharge} />
      <BadgeDemo Badge={Idle} />
    </div>
  ),
};

export const SectionHeaderAtom: Story = {
  render: () => (
    <div>
      <SectionHeader title="Bölüm Başlığı" />
      <SectionHeader title="İkinci Bölüm" />
    </div>
  ),
};
