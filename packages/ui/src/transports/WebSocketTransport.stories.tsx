import type { Meta, StoryObj } from "@storybook/react";
import React, { useMemo, useState } from "react";
import { WebSocketTransport } from "./WebSocketTransport";
import type { ConnectionState } from "@gd-monorepo/shared-types";
import { COLORS } from "../colors";

const meta: Meta<typeof WebSocketTransport> = {
  title: "Transports/WebSocketTransport",
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

const Demo: React.FC = () => {
  const transport = useMemo(() => new WebSocketTransport("ws://localhost:1/ws"), []);
  const [state, setState] = useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const track = () => {
    const unsubscribe = transport.subscribe({
      onData: () => {},
      onError: (e) => setError(e.message),
      onConnectionChange: (s) => setState(s),
    });
    return unsubscribe;
  };

  const connect = () => {
    track();
    void transport.connect({ deviceId: "bsc-1" });
  };

  const disconnect = () => void transport.disconnect();

  return (
    <div style={{ padding: 24, background: COLORS.bgCard, borderRadius: 12 }}>
      <h3 style={{ color: COLORS.textWhite, margin: 0, fontSize: 14 }}>
        Durum: <span style={{ color: state === "connected" ? COLORS.success : state === "error" ? COLORS.error : COLORS.warning }}>{state}</span>
      </h3>
      {error ? <p style={{ color: COLORS.error, fontSize: 13 }}>{error}</p> : null}
      <p style={{ color: COLORS.textMuted, fontSize: 13 }}>
        Erişilemez bir adrese bağlanır — hata/bağlanma durum geçişlerini gösterir.
      </p>
      <button onClick={connect}>Bağlan</button> <button onClick={disconnect}>Kapat</button>
    </div>
  );
};

export const StateMachine: Story = {
  render: () => <Demo />,
};
