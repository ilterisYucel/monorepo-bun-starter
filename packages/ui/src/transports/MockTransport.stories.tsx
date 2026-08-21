import type { Meta, StoryObj } from "@storybook/react";
import React, { useEffect, useMemo, useState } from "react";
import { MockTransport } from "./MockTransport";
import type { TelemetryData, ConnectionState } from "@gd-monorepo/shared-types";
import { createMockTransportDefs } from "../__stories__/mocks/factories";
import { COLORS } from "../colors";

const meta: Meta<typeof MockTransport> = {
  title: "Transports/MockTransport",
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

const Demo: React.FC = () => {
  const transport = useMemo(() => new MockTransport(createMockTransportDefs(), 1000), []);
  const [state, setState] = useState<ConnectionState>("idle");
  const [latest, setLatest] = useState<TelemetryData[]>([]);

  useEffect(() => {
    let alive = true;
    const unsubscribe = transport.subscribe({
      onData: (batch) => {
        if (alive) setLatest(batch.slice(-3));
      },
      onError: () => {},
      onConnectionChange: (s) => {
        if (alive) setState(s);
      },
    });
    void transport.connect({ deviceId: "bsc-1" });
    return () => {
      alive = false;
      unsubscribe();
      void transport.disconnect();
    };
  }, [transport]);

  return (
    <div style={{ padding: 24, background: COLORS.bgCard, borderRadius: 12 }}>
      <h3 style={{ color: COLORS.textWhite, margin: 0, fontSize: 14 }}>
        Bağlantı: <span style={{ color: state === "connected" ? COLORS.success : COLORS.warning }}>{state}</span>
      </h3>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 12, color: COLORS.textPrimary, fontSize: 13 }}>
        {latest.map((t, i) => (
          <li key={i}>
            {t.name}: {String(t.value)} {t.unit}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const LiveFeed: Story = {
  render: () => <Demo />,
};
