import { describe, it, expect } from "vitest";
import { randomFloat } from "./utils";

/**
 * randomFloat sözleşmesi:
 * - Her çağrıda [0,1) aralığında sayı döner (kriptografik uniform dağılım).
 */
describe("randomFloat", () => {
  it("[0,1) aralığında döner — 100 örneklem", () => {
    for (let i = 0; i < 100; i++) {
      const value = randomFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
