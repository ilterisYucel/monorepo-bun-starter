import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TranslationProvider, TR_DICT, EN_DICT } from "@gd-monorepo/ui";
import { FIELD_TR_DICT } from "../../../i18n/tr";
import { RegisterContainerForm } from "./RegisterContainerForm";
import { containersApi } from "../services/containersApi";

/**
 * RegisterContainerForm sözleşmesi (2026-08-30):
 * - İstemci doğrulaması: containerId boş, token < 32 → hata mesajı; sunucuya
 *   istek GİTMEZ.
 * - "Konteyner Adresi" alanı YOKTUR (outbound WSS mimarisi — 2026-08-30).
 * - Geçerli girdi → containersApi.register(fieldId, { containerId, token })
 *   çağrılır; başarıda success mesajı + onRegistered; alanlar temizlenir.
 * - API hatası → hata mesajı (onRegistered çağrılmaz).
 */

vi.mock("../services/containersApi", () => ({
  containersApi: {
    list: vi.fn(),
    timeSeries: vi.fn(),
    openSession: vi.fn(),
    endSession: vi.fn(),
    register: vi.fn(),
  },
}));

function renderForm() {
  const onRegistered = vi.fn();
  render(
    <TranslationProvider
      dictionaries={{ tr: { ...TR_DICT, ...FIELD_TR_DICT }, en: EN_DICT }}
      defaultLocale="tr"
    >
      <RegisterContainerForm fieldId="f-1" onRegistered={onRegistered} />
    </TranslationProvider>,
  );
  return { onRegistered };
}

const fill = (values: { id?: string; token?: string }) => {
  if (values.id !== undefined) {
    fireEvent.change(screen.getByLabelText("Konteyner Kimliği"), {
      target: { value: values.id },
    });
  }
  if (values.token !== undefined) {
    fireEvent.change(screen.getByLabelText("Service Token"), {
      target: { value: values.token },
    });
  }
};

const valid = {
  id: "container-1",
  token: "a".repeat(32),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RegisterContainerForm", () => {
  it("adres alanı render edilmez (mimari sözleşme)", () => {
    renderForm();
    expect(screen.queryByLabelText("Konteyner Adresi")).toBeNull();
  });

  it("boş containerId → hata, register çağrılmaz", async () => {
    const { onRegistered } = renderForm();
    fill({ id: "", token: valid.token });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByText("Konteyner kimliği gerekli")).toBeTruthy();
    expect(containersApi.register).not.toHaveBeenCalled();
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it("32 karakterden kısa token → hata, register çağrılmaz", async () => {
    renderForm();
    fill({ id: valid.id, token: "kisa" });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(
      await screen.findByText("Token en az 32 karakter olmalı"),
    ).toBeTruthy();
    expect(containersApi.register).not.toHaveBeenCalled();
  });

  it("geçerli girdi → register + success + onRegistered + alanlar temizlenir", async () => {
    vi.mocked(containersApi.register).mockResolvedValue({
      registered: true,
      containerId: valid.id,
    });
    const { onRegistered } = renderForm();
    fill(valid);
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() =>
      expect(containersApi.register).toHaveBeenCalledWith("f-1", {
        containerId: valid.id,
        token: valid.token,
      }),
    );
    expect(
      await screen.findByText(
        "Kayıt tamamlandı — konteyner artık bağlanabilir",
      ),
    ).toBeTruthy();
    expect(onRegistered).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByLabelText("Konteyner Kimliği") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Service Token") as HTMLInputElement).value,
    ).toBe("");
  });

  it("API hatası → hata mesajı, onRegistered çağrılmaz", async () => {
    vi.mocked(containersApi.register).mockRejectedValue(new Error("401"));
    const { onRegistered } = renderForm();
    fill(valid);
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByText(/Kayıt başarısız/)).toBeTruthy();
    expect(onRegistered).not.toHaveBeenCalled();
  });
});
