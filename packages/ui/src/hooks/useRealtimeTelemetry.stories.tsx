import type { Meta, StoryObj } from "@storybook/react";
import React, { useEffect, useMemo, useState } from "react";
import { useRealtimeTelemetry } from "./useRealtimeTelemetry";
import { MockTransport } from "../transports/MockTransport";
import { createMockTransportDefs } from "../__stories__/mocks/factories";
import { COLORS } from "../colors";

const meta: Meta = {
  title: "Hooks/useRealtimeTelemetry",
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

const Demo: React.FC = () => {
  const transport = useMemo(() => new MockTransport(createMockTransportDefs(), 800), []);
  const { data, isConnected, error, reconnect } = useRealtimeTelemetry({
    transport,
    deviceId: "bsc-1",
  });
  const [last, setLast] = useState<string>("");

  useEffect(() => {
    const tail = data[data.length - 1];
    if (tail) setLast(`${tail.name}=${tail.value} ${tail.unit}`);
  }, [data]);

  return (
    <div style={{ padding: 24, background: COLORS.bgCard, borderRadius: 12 }}>
      <h3 style={{ color: COLORS.textWhite, margin: 0, fontSize: 14 }}>
        isConnected:{" "}
        <span style={{ color: isConnected ? COLORS.success : COLORS.warning }}>
          {String(isConnected)}
        </span>
      </h3>
      <p style={{ color: COLORS.textPrimary, fontSize: 13 }}>Tampon: {data.length} kayıt</p>
      <p style={{ color: COLORS.textPrimary, fontSize: 13 }}>Son: {last}</p>
      {error ? <p style={{ color: COLORS.error, fontSize: 13 }}>Hata: {error}</p> : null}
      <button onClick={reconnect}>Yeniden Bağlan</button>
    </div>
  );
};

export const RealtimeBuffer: Story = {
  render: () => <Demo />,
};
