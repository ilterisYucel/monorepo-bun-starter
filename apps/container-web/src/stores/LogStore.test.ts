import { describe, it, expect, vi } from "vitest";

describe("LogStore", () => {
  it("can be imported without localStorage errors", async () => {
    // ponytail: zustand persist needs localStorage mock in test env
    const storeModule = await vi.importActual<typeof import("./LogStore")>(
      "./LogStore",
    );
    expect(storeModule.useLogStore).toBeDefined();
    expect(typeof storeModule.useLogStore.getState).toBe("function");
  });

  it("starts with empty logs", async () => {
    const { useLogStore } = await vi.importActual<
      typeof import("./LogStore")
    >("./LogStore");
    const state = useLogStore.getState();
    expect(state.logs).toEqual([]);
  });
});
