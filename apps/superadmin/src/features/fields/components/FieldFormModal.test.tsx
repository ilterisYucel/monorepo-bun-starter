import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { BOSS_TR_DICT } from "../../../i18n/tr";
import { BOSS_EN_DICT } from "../../../i18n/en";
import { FieldFormModal } from "./FieldFormModal";
import type { AdminField } from "../types";

/**
 * FieldFormModal sözleşmesi (2026-09-14 — uplink kayıt alanları):
 * - Yeni saha: "Saha Kimliği (UUID)" + "Uplink Token" alanları vardır; ikisi de
 *   OPSIYONELDİR (boşsa input'ta YER ALMAZ — geriye uyumlu).
 * - Saha Kimliği doluysa geçerli UUID olmalı (büyük harf → lowercase normalize);
 *   geçersizse hata + create ÇAĞRILMAZ (konteyner kayıt formu deseni).
 * - Token doluysa >= 32 karakter olmalı; kısa → hata + create ÇAĞRILMAZ.
 * - Geçerli girdi → create({ name, id, uplinkToken, ... }) + onClose.
 * - Edit modu: Saha Kimliği disabled (kayıt anahtarı — PUT path); token
 *   düzenlenebilir → update({ id, input }); id input'ta GÖNDERİLMEZ.
 * - API hatası → hata mesajı, onClose ÇAĞRILMAZ.
 */

const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock("../hooks/useAdminFields", () => ({
  useFieldList: () => ({ data: [], isLoading: false, isError: false }),
  useField: () => ({ data: undefined }),
  useCreateField: () => ({ mutateAsync: createMock }),
  useUpdateField: () => ({ mutateAsync: updateMock }),
}));

const FIELD_ID = "5d5e49dc-7757-4f3e-a026-0263c2966bc6";
const TOKEN = "a".repeat(32);

const editingField = {
  id: "f-1",
  name: "Saha 1",
  location: { lat: 38.4, lng: 27.1 },
  api_url: null,
  status: "offline",
  container_count: 0,
  online_containers: 0,
  total_power_mw: null,
  avg_soc: null,
  active_alarms: 0,
  last_seen_at: null,
  metadata: {},
  field_type: "battery",
  created_at: "",
  updated_at: "",
} as unknown as AdminField;

function renderModal(editing?: AdminField) {
  const onClose = vi.fn();
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
      extraKeys={{ tr: BOSS_TR_DICT, en: BOSS_EN_DICT }}
    >
      <FieldFormModal open editing={editing} onClose={onClose} />
    </TranslationProvider>,
  );
  return onClose;
}

function fill(values: { name?: string; id?: string; token?: string }) {
  if (values.name !== undefined) {
    fireEvent.change(screen.getByLabelText("Saha Adı"), {
      target: { value: values.name },
    });
  }
  if (values.id !== undefined) {
    fireEvent.change(screen.getByLabelText("Saha Kimliği (UUID)"), {
      target: { value: values.id },
    });
  }
  if (values.token !== undefined) {
    fireEvent.change(screen.getByLabelText("Uplink Token"), {
      target: { value: values.token },
    });
  }
}

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

beforeEach(() => {
  vi.clearAllMocks();
  createMock.mockResolvedValue({});
  updateMock.mockResolvedValue({});
});

describe("FieldFormModal", () => {
  it("Saha Kimliği + Uplink Token alanları render edilir (hint'lerle)", () => {
    renderModal();
    expect(screen.getByLabelText("Saha Kimliği (UUID)")).toBeTruthy();
    expect(screen.getByLabelText("Uplink Token")).toBeTruthy();
    expect(screen.getByText(/FIELD_ID/)).toBeTruthy();
    expect(screen.getByText(/FIELD_UPLINK_TOKEN/)).toBeTruthy();
  });

  it("boş id+token → create input'unda id/uplinkToken YER ALMAZ (geriye uyumlu)", async () => {
    const onClose = renderModal();
    fill({ name: "Saha 1" });
    submit();

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const payload = createMock.mock.calls[0][0];
    expect(payload.name).toBe("Saha 1");
    expect("id" in payload).toBe(false);
    expect("uplinkToken" in payload).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("geçersiz UUID → hata, create ÇAĞRILMAZ", async () => {
    const onClose = renderModal();
    fill({ name: "Saha 1", id: "default-field", token: TOKEN });
    submit();

    expect(
      await screen.findByText("Geçersiz Saha Kimliği (UUID olmalı)"),
    ).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("32 karakterden kısa token → hata, create ÇAĞRILMAZ", async () => {
    const onClose = renderModal();
    fill({ name: "Saha 1", id: FIELD_ID, token: "kisa" });
    submit();

    expect(
      await screen.findByText("Token en az 32 karakter olmalı"),
    ).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("geçerli id+token → create + onClose; büyük harfli UUID lowercase normalize edilir", async () => {
    const onClose = renderModal();
    fill({
      name: "Saha 1",
      id: "5D5E49DC-7757-4F3E-A026-0263C2966BC6",
      token: TOKEN,
    });
    submit();

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Saha 1",
        id: FIELD_ID,
        uplinkToken: TOKEN,
      }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("edit modu → Saha Kimliği disabled + kayıt değeri; token rotasyonu update'e gider", async () => {
    const onClose = renderModal(editingField);
    const idInput = screen.getByLabelText(
      "Saha Kimliği (UUID)",
    ) as HTMLInputElement;
    expect(idInput.disabled).toBe(true);
    expect(idInput.value).toBe("f-1");

    fill({ name: "Saha 1 (guncel)", token: TOKEN });
    submit();

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith({
      id: "f-1",
      input: expect.objectContaining({
        name: "Saha 1 (guncel)",
        uplinkToken: TOKEN,
      }),
    });
    const input = updateMock.mock.calls[0][0].input;
    expect("id" in input).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("API hatası → hata mesajı, onClose ÇAĞRILMAZ", async () => {
    createMock.mockRejectedValue(new Error("500"));
    const onClose = renderModal();
    fill({ name: "Saha 1", id: FIELD_ID, token: TOKEN });
    submit();

    expect(
      await screen.findByText("Kayıt başarısız — sunucu hatası olabilir"),
    ).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
