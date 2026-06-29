import React from "react";
import { BSC } from "@gd-monorepo/ui";
import type { BSCUnit } from "../../deprecated/BSCGraphic/BSCGraphic.types";
import type { Rack } from "../../../types/rack";
import { createMockBSCUnit } from "../../../__stories__/mocks/factories";

const meta = { title: "Graphics/BSC", component: BSC, tags: ["autodocs"] };
export default meta;

const rack = (overrides: Partial<Rack>): Rack => ({
  id: 1,
  deviceId: "BSC-1",
  name: "Rack-1",
  status: "online",
  charge_status: "Charge",
  soc: 50,
  soh: 95,
  voltage: 48,
  current: 6,
  power_kw: 0.3,
  temperature: 28,
  ...overrides,
});

const chargeUnit: BSCUnit = createMockBSCUnit({
  deviceId: "BSC-1",
  racks: [
    rack({ id: 1, name: "Rack-1", status: "online", charge_status: "Charge", soc: 85 }),
    rack({ id: 2, name: "Rack-2", status: "online", charge_status: "Charge", soc: 72 }),
    rack({ id: 3, name: "Rack-3", status: "online", charge_status: "Discharge", soc: 38 }),
    rack({ id: 4, name: "Rack-4", status: "offline", charge_status: "Idle", soc: 0 }),
  ],
  breakerStatus: "online",
  breakerPosition: "close",
  dcOutput: { status: "online", voltage: 48, current: 12 },
});

export const ChargeMode = () => (
  <div style={{ width: 820, background: "#0f0f1a", borderRadius: 8 }}>
    <BSC deviceId="BSC-1" bscUnits={[chargeUnit]} flowDirection="Charge" width={800} bordered showRefresh={false} />
  </div>
);

export const DischargeMode = () => (
  <div style={{ width: 820, background: "#0f0f1a", borderRadius: 8 }}>
    <BSC deviceId="BSC-1" bscUnits={[chargeUnit]} flowDirection="Discharge" width={800} bordered showRefresh={false} />
  </div>
);

export const IdleMode = () => (
  <div style={{ width: 820, background: "#0f0f1a", borderRadius: 8 }}>
    <BSC deviceId="BSC-1" bscUnits={[chargeUnit]} flowDirection="Idle" width={800} bordered showRefresh={false} />
  </div>
);

const unit2: BSCUnit = createMockBSCUnit({
  deviceId: "BSC-2",
  racks: [
    rack({ id: 5, deviceId: "BSC-2", name: "Rack-5", status: "online", charge_status: "Charge", soc: 92 }),
    rack({ id: 6, deviceId: "BSC-2", name: "Rack-6", status: "online", charge_status: "Discharge", soc: 45 }),
    rack({ id: 7, deviceId: "BSC-2", name: "Rack-7", status: "offline", charge_status: "Idle", soc: 0 }),
    rack({ id: 8, deviceId: "BSC-2", name: "Rack-8", status: "online", charge_status: "Charge", soc: 61 }),
  ],
  breakerStatus: "online",
  breakerPosition: "close",
  dcOutput: { status: "online", voltage: 48, current: 8 },
});

export const TwoBSCUnits = () => (
  <div style={{ width: 820, background: "#0f0f1a", borderRadius: 8 }}>
    <BSC deviceId="BSC-FARM" bscUnits={[chargeUnit, unit2]} flowDirection="Charge" width={800} bordered showRefresh={false} />
  </div>
);
