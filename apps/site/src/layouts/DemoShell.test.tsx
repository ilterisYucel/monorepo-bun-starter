import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

/**
 * DemoShell zorunlu şifre değişimi guard'ı — SITE-MIMARISI UC-4 (AK-4.1, AK-4.7).
 * Alt sayfa ve hedef rotalar işaretçi metinlerle temsil edilir.
 */

const { authState, tunnel } = vi.hoisted(() => ({
  authState: { current: {} as Record<string, unknown> },
  tunnel: { on: false },
}));

vi.mock("../features/auth/stores/AuthStore", () => ({
  useAuthStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(authState.current) : authState.current,
}));

vi.mock("../lib/api-base", () => ({
  isTunnelMode: () => tunnel.on,
}));

vi.mock("../lib/site-field", () => ({
  siteFieldId: () => "FIELD-1",
}));

import { DemoShell } from "./DemoShell";

function setUser(role: string, mustChangePassword: boolean): void {
  authState.current = {
    user: { id: "u-1", username: role, role, name: role, mustChangePassword },
    isAuthenticated: true,
    logout: vi.fn(),
  };
}

/** Geçerli yolu görünür kılar — navigasyon iddiaları için. */
const LocationProbe: React.FC = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

function renderAt(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<DemoShell />}>
          <Route path="projects" element={<div>PROJECTS-PAGE</div>} />
          <Route path="field/:fieldId/*" element={<div>FIELD-PAGE</div>} />
          <Route path="fields/:fieldId/ui/projects" element={<div>PROJECTS-PAGE</div>} />
          <Route path="fields/:fieldId/ui/*" element={<div>FIELD-PAGE</div>} />
        </Route>
        <Route path="/change-password" element={<div>CHANGE-PASSWORD-PAGE</div>} />
        <Route path="/login" element={<div>LOGIN-PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const location = (): string => screen.getByTestId("location").textContent ?? "";
const selectedTabs = (): string[] =>
  screen
    .getAllByRole("tab")
    .filter((t) => t.getAttribute("aria-selected") === "true")
    .map((t) => t.textContent ?? "");

describe("DemoShell — zorunlu şifre değişimi guard'ı (UC-4)", () => {
  beforeEach(() => {
    tunnel.on = false;
  });

  it("AK-4.1: admin mustChangePassword=true → /change-password, alt sayfa render edilmez", () => {
    setUser("admin", true);
    renderAt("/projects");
    expect(screen.getByText("CHANGE-PASSWORD-PAGE")).toBeTruthy();
    expect(screen.queryByText("PROJECTS-PAGE")).toBeNull();
  });

  it("AK-4.7: guest mustChangePassword=true → yönlendirme yok", () => {
    setUser("guest", true);
    renderAt("/projects");
    expect(screen.getByText("PROJECTS-PAGE")).toBeTruthy();
    expect(screen.queryByText("CHANGE-PASSWORD-PAGE")).toBeNull();
  });

  it("AK-4.7: tünel modunda mustChangePassword=true → yönlendirme yok", () => {
    tunnel.on = true;
    setUser("admin", true);
    renderAt("/fields/FIELD-1/ui/projects");
    expect(screen.getByText("PROJECTS-PAGE")).toBeTruthy();
    expect(screen.queryByText("CHANGE-PASSWORD-PAGE")).toBeNull();
  });

  it("mustChangePassword=false → alt sayfa render edilir", () => {
    setUser("admin", false);
    renderAt("/projects");
    expect(screen.getByText("PROJECTS-PAGE")).toBeTruthy();
  });

  it("oturum yok → /login", () => {
    authState.current = { user: null, isAuthenticated: false, logout: vi.fn() };
    renderAt("/projects");
    expect(screen.getByText("LOGIN-PAGE")).toBeTruthy();
  });

  it("oturum işaretli ama kullanıcı nesnesi yok → guard çökmez, sayfa render edilir", () => {
    authState.current = { user: null, isAuthenticated: true, logout: vi.fn() };
    renderAt("/projects");
    expect(screen.getByText("PROJECTS-PAGE")).toBeTruthy();
  });
});

/**
 * Karakterizasyon testleri — DemoShell'in UC-4 öncesi mevcut davranışı (AGENTS:
 * dokunulan testsiz dosya önce testle sabitlenir). Davranış DEĞİŞTİRİLMEZ.
 */
describe("DemoShell — kabuk davranışı (karakterizasyon)", () => {
  beforeEach(() => {
    tunnel.on = false;
    setUser("admin", false);
  });

  it("Projects sayfasında breadcrumb kalın 'Projects', sekme çubuğu yok", () => {
    renderAt("/projects");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" }).textContent).toBe("Projects");
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("proje sayfasında 6 sekme ve 'Projects / GD-1' breadcrumb'ı görünür", () => {
    renderAt("/field/FIELD-1");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Site layout",
      "Devices",
      "Operations",
      "Grid & Market",
      "Faults",
      "Admin",
    ]);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" }).textContent).toBe("Projects/GD-1");
    expect(selectedTabs()).toEqual(["Site layout"]);
  });

  it.each([
    ["devices", "Devices"],
    ["operations", "Operations"],
    ["market", "Grid & Market"],
    ["faults", "Faults"],
    ["admin", "Admin"],
  ])("/%s yolunda yalnız '%s' sekmesi seçilidir", (suffix, label) => {
    renderAt(`/field/FIELD-1/${suffix}`);
    expect(selectedTabs()).toEqual([label]);
  });

  it("sekme tıklaması standalone tabana göre yönlendirir", () => {
    renderAt("/field/FIELD-1");
    fireEvent.click(screen.getByRole("tab", { name: "Devices" }));
    expect(location()).toBe("/field/FIELD-1/devices");
    fireEvent.click(screen.getByRole("tab", { name: "Site layout" }));
    expect(location()).toBe("/field/FIELD-1");
  });

  it("tünel modunda sekmeler /fields/:fid/ui tabanını kullanır", () => {
    tunnel.on = true;
    renderAt("/fields/FIELD-1/ui");
    fireEvent.click(screen.getByRole("tab", { name: "Faults" }));
    expect(location()).toBe("/fields/FIELD-1/ui/faults");
  });

  it("breadcrumb 'Projects' butonu standalone'da /projects'e gider", () => {
    renderAt("/field/FIELD-1/devices");
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(location()).toBe("/projects");
  });

  it("breadcrumb 'Projects' butonu tünelde önekli projeler yoluna gider", () => {
    tunnel.on = true;
    renderAt("/fields/FIELD-1/ui/devices");
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(location()).toBe("/fields/FIELD-1/ui/projects");
  });

  it("Logout logout'u çağırır ve /login'e gider", async () => {
    renderAt("/projects");
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(location()).toBe("/login"));
    expect(authState.current.logout).toHaveBeenCalledTimes(1);
  });

  it("tema düğmeleri seçili temayı ve logoyu değiştirir", () => {
    renderAt("/projects");
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Light" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("demo-logo").getAttribute("src")).toMatch(/logo-dark/);
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(screen.getByRole("button", { name: "Light" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("demo-logo").getAttribute("src")).toMatch(/logo-light/);
  });

  it("logo yüklenemezse 'GD-PMS' metnine düşer", () => {
    renderAt("/projects");
    fireEvent.error(screen.getByTestId("demo-logo"));
    expect(screen.queryByTestId("demo-logo")).toBeNull();
    expect(screen.getByText("GD-PMS")).toBeTruthy();
  });

  describe("saat", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
      vi.setSystemTime(new Date(2026, 0, 1, 9, 5, 7));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("HH:MM:SS biçiminde sıfır dolgulu gösterir ve her saniye ilerler", () => {
      renderAt("/projects");
      expect(screen.getByText("09:05:07")).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText("09:05:08")).toBeTruthy();
    });

    it("unmount'ta zamanlayıcıyı temizler (sızıntı yok)", () => {
      const { unmount } = renderAt("/projects");
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
