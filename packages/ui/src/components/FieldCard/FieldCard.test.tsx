import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { FieldCard } from "./FieldCard";
import { TranslationProvider } from "../../core/TranslationProvider";
import { TR_DICT } from "../../i18n/tr";
import { EN_DICT } from "../../i18n/en";

/**
 * FieldCard sözleşmesi:
 * - Saha adı, durum etiketi (çevrilmiş) ve metrik satırları gösterir.
 * - onClick tıklamada çağrılır.
 */

const field = {
  id: "f-1",
  name: "Saha 1",
  status: "online" as const,
  containerCount: 4,
  onlineContainerCount: 3,
  totalPowerMw: 12.4,
  avgSoc: 82,
  activeAlarms: 1,
};

const renderCard = (
  props: Partial<Parameters<typeof FieldCard>[0]> = {},
) =>
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
    >
      <FieldCard field={field} {...props} />
    </TranslationProvider>,
  );

describe("FieldCard @ui", () => {
  it("saha adını ve metrikleri gösterir", () => {
    const { getByText } = renderCard();
    expect(getByText("Saha 1")).toBeTruthy();
    expect(getByText("Konteyner")).toBeTruthy();
    expect(getByText("3/4")).toBeTruthy();
    expect(getByText("12.4 MW")).toBeTruthy();
    expect(getByText("%82")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();
  });

  it("durum etiketini çevirir (online → Çevrimiçi)", () => {
    const { getByText } = renderCard();
    expect(getByText("Çevrimiçi")).toBeTruthy();
  });

  it("tıklamada onClick çağrılır", () => {
    const onClick = vi.fn();
    const { getByRole } = renderCard({ onClick });
    fireEvent.click(getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
