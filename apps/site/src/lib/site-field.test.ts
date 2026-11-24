import { describe, it, expect } from "vitest";
import { postLoginDestination } from "./site-field";
import type { User } from "@gd-monorepo/shared-types";

const user = { role: "teknik" } as unknown as User;

describe("postLoginDestination", () => {
  it("fieldId varsa portföy sayfasına yönlendirir (UC-11)", () => {
    expect(postLoginDestination(user, [], "f-1")).toEqual({
      path: "/projects",
    });
  });

  it("fieldId boşsa açık hata döner", () => {
    expect(postLoginDestination(user, [], "")).toEqual({
      error: "Saha kimligi tanimsiz (VITE_FIELD_ID)",
    });
  });

  describe("UC-4 zorunlu şifre değişimi önceliği", () => {
    const mustChange = (role: string) =>
      ({ role, mustChangePassword: true }) as unknown as User;

    it("AK-4.2: mustChangePassword → /change-password (fieldId varken)", () => {
      expect(postLoginDestination(mustChange("admin"), [], "f-1")).toEqual({
        path: "/change-password",
      });
    });

    it("AK-4.2: mustChangePassword saha kimliği hatasından önce gelir (fieldId boş)", () => {
      expect(postLoginDestination(mustChange("admin"), [], "")).toEqual({
        path: "/change-password",
      });
    });

    it("AK-4.7: guest mustChangePassword taşısa da /projects'e gider", () => {
      expect(postLoginDestination(mustChange("guest"), [], "f-1")).toEqual({
        path: "/projects",
      });
    });

    it("mustChangePassword=false → /projects", () => {
      const done = { role: "admin", mustChangePassword: false } as unknown as User;
      expect(postLoginDestination(done, [], "f-1")).toEqual({ path: "/projects" });
    });
  });
});
