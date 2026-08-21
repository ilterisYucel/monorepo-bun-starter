import type { Meta, StoryObj } from "@storybook/react";
import React, { useMemo, useState } from "react";
import { HttpPollingTransport } from "./HttpPollingTransport";
import type { ConnectionState } from "@gd-monorepo/shared-types";
import { COLORS } from "../colors";

const meta: Meta<typeof HttpPollingTransport> = {
  title: "Transports/HttpPollingTransport",
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

const Demo: React.FC = () => {
  const transport = useMemo(
    () =>
      new HttpPollingTransport({
        endpoint: "http://localhost:1/api/telemetry/latest",
        intervalMs: 3000,
      }),
    [],
  );
  const [state, setState] = useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const connect = () => {
    transport.subscribe({
      onData: () => {},
      onError: (e) => setError(e.message),
      onConnectionChange: (s) => setState(s),
    });
    void transport.connect({ deviceId: "bsc-1" });
  };

  return (
    <div style={{ padding: 24, background: COLORS.bgCard, borderRadius: 12 }}>
      <h3 style={{ color: COLORS.textWhite, margin: 0, fontSize: 14 }}>
        Durum: <span style={{ color: state === "connected" ? COLORS.success : COLORS.warning }}>{state}</span>
      </h3>
      {error ? <p style={{ color: COLORS.error, fontSize: 13 }}>{error}</p> : null}
      <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
        Erişilemez endpoint'e poll eder — HTTP hatası durumunu gösterir.
      </p>
      <button onClick={connect}>Poll Başlat</button>{" "}
      <button onClick={() => void transport.disconnect()}>Durdur</button>
    </div>
  );
};

export const Polling: Story = {
  render: () => <Demo />,
};
