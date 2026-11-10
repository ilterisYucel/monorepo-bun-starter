import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TranslationProvider, TR_DICT, EN_DICT } from "@gd-monorepo/ui";
import { FIELD_TR_DICT } from "../i18n/tr";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { siteFieldId } from "../lib/site-field";

/**
 * ChangePasswordPage sözleşmesi (2026-09-14):
 * - Şifre değişimi başarılı + admin → `fieldRootPath(siteFieldId())`'a gider.
 *   "default-field" sahte kimliği ASLA kullanılmaz (Faz 5 S10i kalıntısı —
 *   user.fieldIds boş gelince tüm istekler `uuid: "default-field"` ile 500
 *   alıyordu).
 * - VITE_FIELD_ID boşsa (siteFieldId() === "") → hata mesajı, navigasyon YOK
 *   (site-field.ts "sessiz takılma yok" sözleşmesi).
 * - boss rolü → /map (mevcut davranış korunur).
 * - API hatası → hata mesajı, navigasyon YOK.
 */

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("../features/auth/stores/AuthStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("../lib/site-field", () => ({
  siteFieldId: vi.fn(),
}));

const FIELD_ID = "5d5e49dc-7757-4f3e-a026-0263c2966bc6";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "u-1",
    username: "admin",
    role: "admin",
    name: "Admin",
    fieldIds: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function renderPage(
  user: ReturnType<typeof makeUser>,
  changePassword: () => Promise<void> = vi.fn().mockResolvedValue(undefined),
) {
  vi.mocked(useAuthStore).mockReturnValue({
    user,
    changePassword,
  });
  render(
    <TranslationProvider
      dictionaries={{ tr: { ...TR_DICT, ...FIELD_TR_DICT }, en: EN_DICT }}
      defaultLocale="tr"
    >
      <ChangePasswordPage />
    </TranslationProvider>,
  );
  return changePassword;
}

function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText("Mevcut Şifre"), {
    target: { value: "eski12345" },
  });
  fireEvent.change(
    screen.getByPlaceholderText("Yeni Şifre (en az 8 karakter)"),
    { target: { value: "yeni12345" } },
  );
  fireEvent.change(screen.getByPlaceholderText("Yeni Şifre (Tekrar)"), {
    target: { value: "yeni12345" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Şifreyi Değiştir" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(siteFieldId).mockReturnValue(FIELD_ID);
});

describe("ChangePasswordPage", () => {
  it("başarılı değişim + admin → fieldRootPath(siteFieldId()) — 'default-field' ASLA kullanılmaz", async () => {
    const changePassword = renderPage(makeUser());
    fillAndSubmit();

    await waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith(`/field/${FIELD_ID}`, {
      replace: true,
    });
    expect(navigateMock).not.toHaveBeenCalledWith(
      "/field/default-field",
      expect.anything(),
    );
    expect(JSON.stringify(navigateMock.mock.calls)).not.toContain(
      "default-field",
    );
  });

  it("fieldIds boşken siteFieldId kullanılır — sahte kimliğe düşmez", async () => {
    // user.fieldIds bilinçli olarak [] — login yanıtı tek saha modelinde
    // fieldIds taşımaz; eski kod burada "default-field" fallback'ine düşüyordu.
    renderPage(makeUser({ fieldIds: [] }));
    fillAndSubmit();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith(`/field/${FIELD_ID}`, {
      replace: true,
    });
  });

  it("siteFieldId boşsa → hata mesajı, navigasyon YOK", async () => {
    vi.mocked(siteFieldId).mockReturnValue("");
    const changePassword = renderPage(makeUser());
    fillAndSubmit();

    await waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Şifre değiştirilemedi")).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("boss rolü → /map (LoginPage sözleşmesi — SPA navigasyonu)", async () => {
    const changePassword = renderPage(makeUser({ role: "boss" }));
    fillAndSubmit();

    await waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/map", { replace: true });
  });

  it("API hatası → hata mesajı, navigasyon YOK", async () => {
    const changePassword = vi.fn().mockRejectedValue(new Error("500"));
    renderPage(makeUser(), changePassword);
    fillAndSubmit();

    expect(await screen.findByText("Şifre değiştirilemedi")).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
