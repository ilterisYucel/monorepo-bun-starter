import type { Meta, StoryObj } from "@storybook/react";
import React, { useMemo } from "react";
import { DeviceTelemetryProvider } from "./DeviceTelemetryProvider";
import { MockTransport } from "../../transports/MockTransport";
import { createMockTransportDefs } from "../../__stories__/mocks/factories";
import { COLORS } from "../../colors";

const meta: Meta<typeof DeviceTelemetryProvider> = {
  title: "Core/DeviceTelemetryProvider",
  component: DeviceTelemetryProvider,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DeviceTelemetryProvider>;

const Wrapper: React.FC = () => {
  const transport = useMemo(
    () => new MockTransport(createMockTransportDefs(), 1000),
    [],
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        alignItems: "center",
        padding: 24,
        background: COLORS.bgCard,
        borderRadius: 12,
      }}
    >
      <DeviceTelemetryProvider deviceId="bsc-1" transport={transport}>
        <DeviceTelemetryProvider.Gauge metric="Voltage" label="Voltaj" />
        <DeviceTelemetryProvider.Gauge metric="Current" label="Akım" />
        <DeviceTelemetryProvider.Gauge metric="Temperature" label="Sıcaklık" />
        <DeviceTelemetryProvider.StatusBadge />
      </DeviceTelemetryProvider>
      <DeviceTelemetryProvider deviceId="bsc-2" transport={transport}>
        <DeviceTelemetryProvider.Gauge metric="Voltage" label="Voltaj (izole)" />
        <DeviceTelemetryProvider.StatusBadge />
      </DeviceTelemetryProvider>
    </div>
  );
};

export const IsolatedStreams: Story = {
  render: () => <Wrapper />,
};

export const DisabledDevice: Story = {
  render: () => {
    const transport = new MockTransport(createMockTransportDefs(), 1000);
    return (
      <div style={{ padding: 24, background: COLORS.bgCard, borderRadius: 12 }}>
        <DeviceTelemetryProvider deviceId="" transport={transport}>
          <DeviceTelemetryProvider.StatusBadge />
        </DeviceTelemetryProvider>
      </div>
    );
  },
};
