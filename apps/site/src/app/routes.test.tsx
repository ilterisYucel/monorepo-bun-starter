import type React from "react";
import { describe, it, expect } from "vitest";
import type { RouteObject } from "react-router-dom";
import { routes } from "./routes";
import { LoginPage } from "../pages/LoginPage";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { DemoShell } from "../layouts/DemoShell";
import { DemoProjectLayout } from "../layouts/DemoProjectLayout";
import { DemoProjectsPage } from "../pages/DemoProjectsPage";
import { DemoFieldPage } from "../pages/DemoFieldPage";
import { DemoDevicesPage } from "../pages/DemoDevicesPage";
import { DemoManeuverPage } from "../pages/DemoManeuverPage";
import { DemoMarketPage } from "../pages/DemoMarketPage";
import { DemoFaultsPage } from "../pages/DemoFaultsPage";
import { DemoAdminPage } from "../pages/DemoAdminPage";

/**
 * Rota tablosu sözleşmesi — SITE-MIMARISI UC-2 (önekli login), UC-4
 * (`/change-password` kabuk dışında) + mevcut demo rotaları (karakterizasyon).
 */

type ElementLike = { type: unknown; props: Record<string, unknown> };
const el = (route: RouteObject): ElementLike => route.element as unknown as ElementLike;
const byPath = (list: RouteObject[], path: string): RouteObject => {
  const found = list.find((r) => r.path === path);
  if (!found) throw new Error(`rota yok: ${path}`);
  return found;
};

describe("routes", () => {
  it("üst seviye rotalar: iki login, change-password ve kabuk", () => {
    expect(routes.map((r) => r.path)).toEqual([
      "/login",
      "fields/:fieldId/ui/login",
      "/change-password",
      "/",
    ]);
    expect(el(byPath(routes, "/login")).type).toBe(LoginPage);
    expect(el(byPath(routes, "fields/:fieldId/ui/login")).type).toBe(LoginPage);
  });

  it("AK-4 (UC-4): /change-password ChangePasswordPage'i kabuk DIŞINDA render eder", () => {
    const route = byPath(routes, "/change-password");
    expect(el(route).type).toBe(ChangePasswordPage);
    expect(route.children).toBeUndefined();
  });

  it("kabuk altı: index → /projects, portföy ve iki proje düzeni (standalone + tünel)", () => {
    const shell = byPath(routes, "/");
    expect(el(shell).type).toBe(DemoShell);
    const children = shell.children ?? [];
    const index = children.find((r) => r.index === true);
    expect(index).toBeDefined();
    expect(el(index as RouteObject).props).toMatchObject({ to: "/projects", replace: true });
    expect(children.filter((r) => !r.index).map((r) => r.path)).toEqual([
      "projects",
      "field/:fieldId",
      "fields/:fieldId/ui",
      "fields/:fieldId/ui/projects",
    ]);
    expect(el(byPath(children, "projects")).type).toBe(DemoProjectsPage);
    expect(el(byPath(children, "fields/:fieldId/ui/projects")).type).toBe(DemoProjectsPage);
    expect(el(byPath(children, "field/:fieldId")).type).toBe(DemoProjectLayout);
    expect(el(byPath(children, "fields/:fieldId/ui")).type).toBe(DemoProjectLayout);
  });

  it("proje sekmeleri iki düzen altında aynıdır; eski yollar yeni adlara yönlenir", () => {
    const children = byPath(routes, "/").children ?? [];
    const standalone = byPath(children, "field/:fieldId").children ?? [];
    const tunnel = byPath(children, "fields/:fieldId/ui").children ?? [];
    expect(tunnel).toBe(standalone);

    const index = standalone.find((r) => r.index === true) as RouteObject;
    expect(el(index).type).toBe(DemoFieldPage);
    const pages: Array<[string, React.FC]> = [
      ["devices", DemoDevicesPage],
      ["operations", DemoManeuverPage],
      ["market", DemoMarketPage],
      ["faults", DemoFaultsPage],
      ["admin", DemoAdminPage],
    ];
    pages.forEach(([path, page]) => {
      expect(el(byPath(standalone, path)).type).toBe(page);
    });
    expect(el(byPath(standalone, "cihazlar")).props).toMatchObject({ to: "../devices", replace: true });
    expect(el(byPath(standalone, "manevra")).props).toMatchObject({ to: "../operations", replace: true });
  });
});
