import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { BOSS_TR_DICT } from "../../../i18n/tr";
import { BOSS_EN_DICT } from "../../../i18n/en";
import { FieldRemoteFrame } from "./FieldRemoteFrame";

/**
 * FieldRemoteFrame sözleşmesi (ContainerFrame paritesi — Boss Faz 3):
 * - Mount'ta oturum açılır; başarıda iframe /fields/:fid/ui/ kurulur.
 * - Oturum hatasında mesaj gösterilir — boş iframe YOK.
 * - Kapat: oturum kapatılır + onClose; Escape (tam ekran dışı) kapatır.
 */

const openMock = vi.fn();
const closeMock = vi.fn();

vi.mock("../services/fieldSessionApi", () => ({
  fieldSessionApi: {
    open: (...args: unknown[]) => openMock(...args),
    close: (...args: unknown[]) => closeMock(...args),
  },
}));

const renderFrame = (onClose = vi.fn()) =>
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
      extraKeys={{ tr: BOSS_TR_DICT, en: BOSS_EN_DICT }}
    >
      <FieldRemoteFrame fieldId="f-1" fieldName="Saha 1" onClose={onClose} />
    </TranslationProvider>,
  );

describe("FieldRemoteFrame", () => {
  it("mount'ta oturum açar ve iframe kurar", async () => {
    openMock.mockResolvedValue({ sessionId: "s-1" });
    renderFrame();
    expect(openMock).toHaveBeenCalledWith("f-1");
    expect(screen.getByText("Oturum açılıyor...")).toBeDefined();
    await waitFor(() => {
      expect(screen.getByTitle("field-f-1")).toBeDefined();
    });
    const iframe = screen.getByTitle("field-f-1") as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toBe("/fields/f-1/ui/");
  });

  it("oturum hatasında mesaj gösterilir — iframe yok", async () => {
    openMock.mockRejectedValue(new Error("401"));
    renderFrame();
    await waitFor(() => {
      expect(screen.getByText(/Field oturumu açılamadı/)).toBeDefined();
    });
    expect(screen.queryByTitle("field-f-1")).toBeNull();
  });

  it("Kapat → oturum kapatılır ve onClose çağrılır", async () => {
    openMock.mockResolvedValue({ sessionId: "s-1" });
    closeMock.mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderFrame(onClose);
    await waitFor(() => expect(screen.getByTitle("field-f-1")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    await waitFor(() => {
      expect(closeMock).toHaveBeenCalledWith("f-1");
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("Escape → kapanır", async () => {
    openMock.mockResolvedValue({ sessionId: "s-1" });
    closeMock.mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderFrame(onClose);
    await waitFor(() => expect(screen.getByTitle("field-f-1")).toBeDefined());
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
