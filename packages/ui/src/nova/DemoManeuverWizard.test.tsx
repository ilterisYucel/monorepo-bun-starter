import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoManeuverWizard } from "./DemoManeuverWizard";
import type { DemoManeuverItem } from "./maneuver-types";

const items: DemoManeuverItem[] = [
  {
    name: "demo_charge",
    label: "Şarj",
    description: "Hedefe kadar şarj",
    kind: "maneuver",
    inputs: [{ name: "powerKw", type: "number", default: 500, label: "Güç (kW)" }],
    timer: true,
  },
  { name: "demo_hidden", label: "Gizli", kind: "maneuver", hidden: true },
];

const units = [
  { n: 1, feeder: "A", note: "Fider A" },
  { n: 2, feeder: "A", note: "Fider A" },
];

describe("DemoManeuverWizard (FR-5.1/5.3/5.4)", () => {
  it("hidden kaydı göstermez (AK-5.1)", () => {
    render(<DemoManeuverWizard items={items} units={units} onExecute={() => {}} />);
    expect(screen.queryByText("Gizli")).toBeNull();
    expect(screen.getAllByText("Şarj").length).toBeGreaterThan(0);
  });

  it("onay akışıyla scope + params gönderir (AK-5.3/5.4)", () => {
    const onExecute = vi.fn();
    render(<DemoManeuverWizard items={items} units={units} onExecute={onExecute} />);
    fireEvent.click(screen.getByRole("button", { name: "Komutu gönder" }));
    fireEvent.click(screen.getByRole("button", { name: "Onayla ve başlat" }));
    expect(onExecute).toHaveBeenCalledTimes(1);
    const payload = onExecute.mock.calls[0][0];
    expect(payload.name).toBe("demo_charge");
    expect(payload.kind).toBe("maneuver");
    expect(payload.scope).toEqual([1, 2]);
    expect(payload.params).toEqual({ powerKw: 500 });
  });

  it("kapsam temizlenince gönderim devre dışı (edge)", () => {
    render(<DemoManeuverWizard items={items} units={units} onExecute={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Temizle" }));
    expect((screen.getByRole("button", { name: "Komutu gönder" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
