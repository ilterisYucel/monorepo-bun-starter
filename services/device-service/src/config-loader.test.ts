import { describe, it, expect } from "vitest";
import { DeviceConfigLoader } from "./config-loader";

describe("DeviceConfigLoader", () => {
  describe("constructor", () => {
    it("throws when configDir is empty", () => {
      expect(() => new DeviceConfigLoader("")).toThrow(
        "[DeviceConfigLoader] configDir bos olamaz",
      );
    });
  });

  describe("parseFile (via public API)", () => {
    it("throws when directory does not exist", () => {
      const loader = new DeviceConfigLoader("/tmp/nonexistent-xyz123");
      expect(() => loader.load()).toThrow(/dizini bulunamadi/);
    });
  });
});
