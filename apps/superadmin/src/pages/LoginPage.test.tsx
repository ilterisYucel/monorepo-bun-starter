import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { BOSS_TR_DICT } from "../i18n/tr";
import { BOSS_EN_DICT } from "../i18n/en";
import { LoginPage } from "./LoginPage";

/**
 * LoginPage sözleşmesi:
 * - Kimliksizken giriş formu render edilir (render yan etkisiz — 2026-09-09
 *   StrictMode uyarısı düzeltmesi: navigate effect'e taşındı).
 * - Kimlikliyken /fields'e yönlendirilir; mustChangePassword ise
 *   /change-password'a.
 */

const user = {
  id: "u-1",
  username: "admin",
  name: "Admin",
  role: "admin" as const,
  fieldIds: [],
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

const renderLogin = () =>
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
      extraKeys={{ tr: BOSS_TR_DICT, en: BOSS_EN_DICT }}
    >
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/fields" element={<div>sahalar-yonlendi</div>} />
          <Route path="/change-password" element={<div>sifre-yonlendi</div>} />
        </Routes>
      </MemoryRouter>
    </TranslationProvider>,
  );

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it("kimliksizken giriş formu gösterilir", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("Kullanıcı adı")).toBeDefined();
    expect(screen.getByRole("button", { name: /Giriş/i })).toBeDefined();
  });

  it("kimlikliyken /fields'e yönlendirilir", async () => {
    useAuthStore.setState({ user, isAuthenticated: true });
    renderLogin();
    expect(await screen.findByText("sahalar-yonlendi")).toBeDefined();
  });

  it("şifre değişimi zorunluysa /change-password'a yönlendirilir", async () => {
    useAuthStore.setState({
      user: { ...user, mustChangePassword: true },
      isAuthenticated: true,
    });
    renderLogin();
    expect(await screen.findByText("sifre-yonlendi")).toBeDefined();
  });
});
