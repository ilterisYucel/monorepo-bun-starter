import { describe, it, expect } from "vitest";
import { renderSystemdUnit } from "./systemd-unit";

describe("renderSystemdUnit", () => {
  it("AK-4.1: zorunlu satırları üretir", () => {
    const unit = renderSystemdUnit({
      name: "revpi-agent",
      binaryPath: "/opt/revpi-agent/agent",
      configPath: "/etc/revpi-agent/agent.env",
      user: "pi",
    });
    expect(unit).toContain("[Unit]");
    expect(unit).toContain("Description=revpi-agent ws-tunnel agent");
    expect(unit).toContain("After=network-online.target");
    expect(unit).toContain("Wants=network-online.target");
    expect(unit).toContain("Type=simple");
    expect(unit).toContain(
      "ExecStart=/opt/revpi-agent/agent run --config /etc/revpi-agent/agent.env",
    );
    expect(unit).toContain("Restart=always");
    expect(unit).toContain("RestartSec=5");
    expect(unit).toContain("User=pi");
    expect(unit).toContain("WantedBy=multi-user.target");
  });

  it("user verilmezse User satırı yok", () => {
    const unit = renderSystemdUnit({
      name: "a",
      binaryPath: "/opt/a/agent",
      configPath: "/etc/a/agent.env",
    });
    expect(unit).not.toContain("User=");
  });
});
