import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TranslationProvider, TR_DICT, EN_DICT } from "@gd-monorepo/ui";
import { DEMO_TR_DICT } from "../i18n/tr";
import { DEMO_EN_DICT } from "../i18n/en";

/**
 * ChangePasswordPage sözleşmesi — SITE-MIMARISI UC-4 (AK-4.3..AK-4.6).
 * Gerçek `postLoginDestination` kullanılır (yalnız `siteFieldId` sabitlenir);
 * `useNavigate` yakalanır, `<Navigate>` gerçek router'da çalışır.
 */

const { navigateMock, authState, field } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  authState: {
    current: {} as Record<string, unknown>,
  },
  field: { id: "FIELD-1" },
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigateMock,
}));

vi.mock("../features/auth/stores/AuthStore", () => ({
  useAuthStore: (selector?: (s: Record<string, unknown>) => unknown) =>
    selector ? selector(authState.current) : authState.current,
}));

vi.mock("../lib/site-field", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/site-field")>()),
  siteFieldId: () => field.id,
}));

import { ChangePasswordPage } from "./ChangePasswordPage";

const adminUser = {
  id: "u-1",
  username: "admin",
  role: "admin",
  name: "Admin",
  mustChangePassword: true,
};

function setAuth(overrides: Record<string, unknown> = {}): ReturnType<typeof vi.fn> {
  const changePassword = vi.fn().mockResolvedValue(undefined);
  authState.current = {
    user: adminUser,
    isAuthenticated: true,
    changePassword,
    ...overrides,
  };
  return (authState.current.changePassword as ReturnType<typeof vi.fn>);
}

function renderPage(): void {
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
      extraKeys={{ tr: DEMO_TR_DICT, en: DEMO_EN_DICT }}
    >
      <MemoryRouter initialEntries={["/change-password"]}>
        <Routes>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/login" element={<div>LOGIN-PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </TranslationProvider>,
  );
}

function fillAndSubmit(oldPw: string, newPw: string, confirmPw: string): void {
  fireEvent.change(screen.getByPlaceholderText("Mevcut Şifre"), {
    target: { value: oldPw },
  });
  fireEvent.change(screen.getByPlaceholderText("Yeni Şifre (en az 8 karakter)"), {
    target: { value: newPw },
  });
  fireEvent.change(screen.getByPlaceholderText("Yeni Şifre (Tekrar)"), {
    target: { value: confirmPw },
  });
  fireEvent.click(screen.getByRole("button", { name: "Şifreyi Değiştir" }));
}

describe("ChangePasswordPage (UC-4)", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    field.id = "FIELD-1";
  });

  it("başlangıçta alanlar boştur ve hata gösterilmez", () => {
    setAuth();
    renderPage();
    const inputs = [
      screen.getByPlaceholderText("Mevcut Şifre"),
      screen.getByPlaceholderText("Yeni Şifre (en az 8 karakter)"),
      screen.getByPlaceholderText("Yeni Şifre (Tekrar)"),
    ] as HTMLInputElement[];
    expect(inputs.map((i) => i.value)).toEqual(["", "", ""]);
    expect(inputs.map((i) => i.type)).toEqual(["password", "password", "password"]);
    expect(screen.queryByTestId("change-password-error")).toBeNull();
  });

  it("form gönderimi tarayıcı varsayılanını engeller (sayfa yenilenmez)", () => {
    setAuth();
    renderPage();
    const form = screen.getByRole("button", { name: "Şifreyi Değiştir" }).closest("form");
    expect(form).not.toBeNull();
    // fireEvent false döner ⇔ preventDefault çağrıldı.
    expect(fireEvent.submit(form as HTMLFormElement)).toBe(false);
  });

  it("AK-4.3 sınırı: tam 8 karakterli yeni şifre kabul edilir", async () => {
    const changePassword = setAuth();
    renderPage();
    fillAndSubmit("password123", "admin123", "admin123");
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith("password123", "admin123"));
    expect(screen.queryByText("Yeni şifre en az 8 karakter olmalı")).toBeNull();
  });

  it("yeni gönderimde önceki hata temizlenir", async () => {
    const changePassword = setAuth();
    changePassword.mockReturnValue(new Promise(() => undefined)); // sunucu yanıtı bekleniyor
    renderPage();
    fillAndSubmit("password123", "kisa", "kisa");
    expect(screen.getByTestId("change-password-error")).toBeTruthy();
    fillAndSubmit("password123", "yenisifre1", "yenisifre1");
    await waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("change-password-error")).toBeNull();
  });

  it("değişim sonrası saha kimliği boşsa açık hata gösterir, navigasyon yapmaz", async () => {
    field.id = "";
    setAuth();
    renderPage();
    fillAndSubmit("password123", "yenisifre1", "yenisifre1");
    expect(await screen.findByText("Saha kimligi tanimsiz (VITE_FIELD_ID)")).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("AK-4.6: oturum işaretli ama kullanıcı yoksa /login'e yönlendirir", () => {
    setAuth({ user: null, isAuthenticated: true });
    renderPage();
    expect(screen.getByText("LOGIN-PAGE")).toBeTruthy();
  });

  it("AK-4.6: kullanıcı var ama oturum düşmüşse /login'e yönlendirir", () => {
    setAuth({ isAuthenticated: false });
    renderPage();
    expect(screen.getByText("LOGIN-PAGE")).toBeTruthy();
  });

  it("form başlığı ve üç şifre alanı görünür", () => {
    setAuth();
    renderPage();
    expect(screen.getByRole("heading", { name: "Şifre Değişimi Zorunlu" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Mevcut Şifre")).toBeTruthy();
    expect(screen.getByPlaceholderText("Yeni Şifre (en az 8 karakter)")).toBeTruthy();
    expect(screen.getByPlaceholderText("Yeni Şifre (Tekrar)")).toBeTruthy();
  });

  it("AK-4.3: yeni şifre 8 karakterden kısaysa hata verir, istek atmaz", () => {
    const changePassword = setAuth();
    renderPage();
    fillAndSubmit("password123", "kisa123", "kisa123");
    expect(screen.getByText("Yeni şifre en az 8 karakter olmalı")).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("AK-4.3: tekrar eşleşmezse hata verir, istek atmaz", () => {
    const changePassword = setAuth();
    renderPage();
    fillAndSubmit("password123", "yenisifre1", "yenisifre2");
    expect(screen.getByText("Şifreler eşleşmiyor")).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("AK-4.4: başarılı değişimde changePassword bir kez çağrılır, /projects'e replace ile gidilir", async () => {
    const changePassword = setAuth();
    changePassword.mockImplementation(async () => {
      // Sunucu yeni token çifti döner → store mustChangePassword=false yazar.
      authState.current = {
        ...authState.current,
        user: { ...adminUser, mustChangePassword: false },
      };
    });
    renderPage();
    fillAndSubmit("password123", "yenisifre1", "yenisifre1");
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/projects", { replace: true });
    });
    expect(changePassword).toHaveBeenCalledTimes(1);
    expect(changePassword).toHaveBeenCalledWith("password123", "yenisifre1");
  });

  it("AK-4.5: sunucu hatasında mesaj gösterir, navigasyon yapmaz", async () => {
    const changePassword = setAuth();
    changePassword.mockRejectedValue(new Error("401"));
    renderPage();
    fillAndSubmit("yanlis", "yenisifre1", "yenisifre1");
    expect(await screen.findByText("Şifre değiştirilemedi")).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("AK-4.6: oturum yokken /login'e yönlendirir", () => {
    setAuth({ user: null, isAuthenticated: false });
    renderPage();
    expect(screen.getByText("LOGIN-PAGE")).toBeTruthy();
  });
});
