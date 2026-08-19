import { describe, it, expect } from "vitest";
import { DEVICE_LIBRARY, DEVICE_TYPES, getDeviceDefinition } from "./index";

describe("device-catalog", () => {
  it("5 built-in cihaz tipi sunar", () => {
    expect(DEVICE_TYPES).toHaveLength(5);
  });

  it("her DeviceType icin tanim var ve type alani kendi anahtariyla eslesiyor", () => {
    for (const type of DEVICE_TYPES) {
      const def = DEVICE_LIBRARY[type];
      expect(def).toBeDefined();
      expect(def.type).toBe(type);
    }
  });

  it("tum tanimlar en az bir protokol ve bir ikon bildirir", () => {
    for (const type of DEVICE_TYPES) {
      const def = DEVICE_LIBRARY[type];
      expect(def.supportedProtocols.length).toBeGreaterThan(0);
      expect(def.icon.length).toBeGreaterThan(0);
    }
  });

  it("getDeviceDefinition bilinen tip icin tanim dondurur", () => {
    expect(getDeviceDefinition("pcs")).toBe(DEVICE_LIBRARY.pcs);
  });
});
