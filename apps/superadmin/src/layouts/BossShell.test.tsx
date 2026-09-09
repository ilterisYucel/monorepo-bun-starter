import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { BOSS_TR_DICT } from "../i18n/tr";
import { BOSS_EN_DICT } from "../i18n/en";
import { BossShell } from "./BossShell";

vi.mock("../features/notifications/hooks/useNotifications", () => ({
  useUnreadCount: () => ({ data: 0 }),
  readLastSeen: () => new Date(0).toISOString(),
}));

vi.mock("../features/fields/hooks/useAdminFields", () => ({
  useFieldList: () => ({ data: [] }),
}));

vi.mock("../features/market/hooks/useMarket", () => ({
  useMarket: () => ({
    data: {
      summary: {
        ptf: { value: 3404.24 },
        gipWeightedAverage: { value: 3372.93 },
      },
    },
  }),
}));

vi.mock("../features/wireguard/hooks/useWireGuard", () => ({
  useWireGuardHosts: () => ({ data: [] }),
  useCreateWgHost: () => ({ mutateAsync: vi.fn() }),
  useWgConnect: () => ({ mutateAsync: vi.fn() }),
  useWgDisconnect: () => ({ mutateAsync: vi.fn() }),
  useWgRemove: () => ({ mutateAsync: vi.fn() }),
}));

const user = {
  id: "u-1",
  username: "boss",
  name: "Patron",
  role: "boss" as const,
  fieldIds: [],
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

const renderShell = () =>
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
      extraKeys={{ tr: BOSS_TR_DICT, en: BOSS_EN_DICT }}
    >
      <MemoryRouter initialEntries={["/fields"]}>
        <Routes>
          <Route path="/" element={<BossShell />}>
            <Route path="fields" element={<div>sahalar-içerik</div>} />
            <Route path="market" element={<div>piyasa-içerik</div>} />
            <Route path="notifications" element={<div>bildirim-içerik</div>} />
          </Route>
          <Route path="/login" element={<div>login-sayfasi</div>} />
        </Routes>
      </MemoryRouter>
    </TranslationProvider>,
  );

describe("BossShell (bütünleşik kabuk)", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it("kimliksiz kullanıcı login'e yönlendirilir", async () => {
    renderShell();
    expect(await screen.findByText("login-sayfasi")).toBeDefined();
  });

  it("girişli kullanıcıda 3 nav öğesi + içerik görünür", async () => {
    useAuthStore.setState({ user, isAuthenticated: true });
    renderShell();
    expect(await screen.findByText("sahalar-içerik")).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Sahalar" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Piyasa" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Bildirimler" }).length).toBeGreaterThan(0);
  });

  it("header'da kullanıcı adı YERİNE PTF ve GİP değerleri gösterilir", async () => {
    useAuthStore.setState({ user, isAuthenticated: true });
    renderShell();
    expect(await screen.findByText("sahalar-içerik")).toBeDefined();
    expect(screen.getByText("PTF")).toBeDefined();
    expect(screen.getByText("GİP")).toBeDefined();
    expect(screen.getByText("3404 ₺")).toBeDefined();
    expect(screen.getByText("3373 ₺")).toBeDefined();
    expect(screen.queryByText("Patron")).toBeNull();
  });

  it("footer ayar butonu settings modalını açar", async () => {
    useAuthStore.setState({ user, isAuthenticated: true });
    renderShell();
    fireEvent.click(await screen.findByRole("button", { name: "Ayarlar" }));
    expect(await screen.findByLabelText("settings-panel")).toBeDefined();
    expect(screen.getByText("Dil")).toBeDefined();
  });

  it("şifre değişimi zorunluysa change-password'a gider", async () => {
    useAuthStore.setState({
      user: { ...user, mustChangePassword: true },
      isAuthenticated: true,
    });
    render(
      <TranslationProvider
        dictionaries={{ tr: TR_DICT, en: EN_DICT }}
        defaultLocale="tr"
        extraKeys={{ tr: BOSS_TR_DICT, en: BOSS_EN_DICT }}
      >
        <MemoryRouter initialEntries={["/fields"]}>
          <Routes>
            <Route path="/" element={<BossShell />}>
              <Route path="fields" element={<div>sahalar-içerik</div>} />
            </Route>
            <Route path="/change-password" element={<div>sifre-sayfasi</div>} />
          </Routes>
        </MemoryRouter>
      </TranslationProvider>,
    );
    expect(await screen.findByText("sifre-sayfasi")).toBeDefined();
  });
});
