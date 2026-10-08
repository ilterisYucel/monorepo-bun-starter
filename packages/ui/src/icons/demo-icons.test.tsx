import { describe, it, expect } from "vitest";
import { SCADA_ICONS, NOVA_ICONS } from "./index";

describe("NOVA demo ikonları (T-32 / AK-7.2)", () => {
  it("SCADA_ICONS'a nova* anahtarlarıyla kaydedilir", () => {
    expect(typeof SCADA_ICONS.novaBolt).toBe("function");
    expect(typeof SCADA_ICONS.novaBattery).toBe("function");
  });

  it("tam 29 nova ikonu içerir", () => {
    expect(Object.keys(NOVA_ICONS)).toHaveLength(29);
  });

  it("mevcut Tabler ikonları korunur (Open-Closed)", () => {
    expect(typeof SCADA_ICONS.dashboard).toBe("function");
    expect(typeof SCADA_ICONS.battery).toBe("function");
    expect(typeof SCADA_ICONS.stop).toBe("function");
  });
});
