import { describe, it, expect } from "vitest";
import { listNovaUnits } from "@gd-monorepo/ui";
import { DEMO_TOPOLOGY, cellCommandName } from "./demo-topology";

describe("demo-topology (UC-2/T-6)", () => {
  it("6 ünite tanımlar (fider A 1-3, B 4-6)", () => {
    const units = listNovaUnits(DEMO_TOPOLOGY);
    expect(units.map((u) => u.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(units.filter((u) => u.feeder === "A")).toHaveLength(3);
    expect(units.filter((u) => u.feeder === "B")).toHaveLength(3);
  });

  it("hücre aksiyonunu demo-MV komut adına eşler", () => {
    expect(cellCommandName("H05", "cb_open")).toBe("H05_open");
    expect(cellCommandName("H05", "es_close")).toBe("H05_earth_close");
    expect(cellCommandName("H01", "es_open")).toBe("H01_earth_open");
  });
});
