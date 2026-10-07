import { describe, it, expect } from "vitest";
import { postLoginDestination } from "./site-field";
import type { User } from "@gd-monorepo/shared-types";

const user = { role: "teknik" } as unknown as User;

describe("postLoginDestination", () => {
  it("fieldId varsa saha rotasına yönlendirir", () => {
    expect(postLoginDestination(user, [], "f-1")).toEqual({
      path: "/field/f-1",
    });
  });

  it("fieldId boşsa açık hata döner", () => {
    expect(postLoginDestination(user, [], "")).toEqual({
      error: "Saha kimligi tanimsiz (VITE_FIELD_ID)",
    });
  });
});
