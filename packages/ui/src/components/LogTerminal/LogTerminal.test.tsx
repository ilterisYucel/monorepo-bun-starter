import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LogTerminal } from "./LogTerminal";
import type { LogProvider } from "../../interfaces/log-provider";
import type { LogEntry } from "@gd-monorepo/shared-types";

afterEach(cleanup);

/**
 * LogTerminal alarm kutucuğu sözleşmesi (Faz 0 eki):
 * - `alarm` metadata'lı satırlarda "Çözüldü" kutucuğu render edilir.
 * - resolved=false → boş + tıklanabilir → `provider.resolveAlarm(entry)` çağrılır.
 * - resolved=true → işaretli + disabled + çözen kullanıcı gösterilir.
 * - alarm'sız satırlarda kutucuk YOKTUR.
 */

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: "l-1",
    timestamp: "2026-08-24T10:00:00Z",
    type: "error",
    source: "system",
    message: "BSC Fault",
    alarm: {
      deviceId: "bsc-1",
      alarmName: "BSC Fault",
      resolved: false,
    },
    ...overrides,
  };
}

function makeProvider(
  logs: LogEntry[],
  resolveAlarm?: (entry: LogEntry) => void,
): LogProvider {
  return {
    logs,
    addLog: vi.fn(),
    clearLogs: vi.fn(),
    resolveAlarm,
  };
}

describe("LogTerminal alarm kutucuğu (Faz 0 eki)", () => {
  it("alarm satırında kutucuk render edilir", () => {
    render(<LogTerminal provider={makeProvider([makeEntry()])} />);
    expect(screen.getByTestId("alarm-resolve-BSC Fault")).toBeTruthy();
  });

  it("resolved=false kutucuk boş ve tıklanınca resolveAlarm çağrılır", () => {
    const resolveAlarm = vi.fn();
    const entry = makeEntry();
    render(
      <LogTerminal provider={makeProvider([entry], resolveAlarm)} />,
    );

    const checkbox = screen.getByTestId(
      "alarm-resolve-BSC Fault",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(false);

    fireEvent.click(checkbox);
    expect(resolveAlarm).toHaveBeenCalledWith(entry);
  });

  it("resolved=true kutucuk işaretli + disabled + çözen gösterilir", () => {
    render(
      <LogTerminal
        provider={makeProvider([
          makeEntry({
            alarm: {
              deviceId: "bsc-1",
              alarmName: "BSC Fault",
              resolved: true,
              resolvedBy: "teknikci",
            },
          }),
        ])}
      />,
    );

    const checkbox = screen.getByTestId(
      "alarm-resolve-BSC Fault",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
    expect(screen.getByText("teknikci")).toBeTruthy();
  });

  it("resolveAlarm yoksa kutucuk disabled (saf UI kullanımı)", () => {
    render(<LogTerminal provider={makeProvider([makeEntry()])} />);
    const checkbox = screen.getByTestId(
      "alarm-resolve-BSC Fault",
    ) as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it("alarm'sız satırda kutucuk YOKTUR", () => {
    render(
      <LogTerminal
        provider={makeProvider([
          makeEntry({ alarm: undefined, message: "normal log" }),
        ])}
      />,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
