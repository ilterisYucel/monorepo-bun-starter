import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TR_DICT, EN_DICT, TranslationProvider } from "@gd-monorepo/ui";
import { BOSS_TR_DICT } from "../i18n/tr";
import { BOSS_EN_DICT } from "../i18n/en";
import { NotificationsPage } from "./NotificationsPage";

vi.mock("../features/notifications/hooks/useNotifications", () => ({
  useNotifications: () => ({
    data: [
      {
        fieldId: "f-1",
        fieldName: "İstanbul-1",
        eventId: "f-1:42",
        eventCode: "device_alarm",
        level: "error",
        category: "app",
        message: "Voltage alarmi",
        context: {},
        occurredAt: "2026-09-07T10:00:00.000Z",
      },
      {
        fieldId: "f-1",
        fieldName: "İstanbul-1",
        eventId: "f-1:43",
        eventCode: "session_open",
        level: "info",
        category: "security",
        message: "Oturum acildi",
        context: {},
        occurredAt: "2026-09-07T11:00:00.000Z",
      },
      {
        fieldId: "f-2",
        fieldName: "Ankara-2",
        eventId: "f-2:9",
        eventCode: "device_alarm",
        level: "error",
        category: "app",
        message: "Sicaklik yuksek",
        context: {},
        occurredAt: "2026-09-07T12:00:00.000Z",
      },
    ],
    isLoading: false,
  }),
  useUnreadCount: () => ({ data: 0 }),
  readLastSeen: () => new Date(0).toISOString(),
  touchLastSeen: vi.fn(),
}));

const renderPage = () =>
  render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      defaultLocale="tr"
      extraKeys={{ tr: BOSS_TR_DICT, en: BOSS_EN_DICT }}
    >
      <NotificationsPage />
    </TranslationProvider>,
  );

describe("NotificationsPage (Faz 5 — filtre barı)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("bildirimleri saha adı + etiket + mesajla listeler", () => {
    renderPage();
    expect(screen.getAllByText("İstanbul-1").length).toBeGreaterThan(0);
    expect(screen.getByText("Voltage alarmi")).toBeDefined();
    expect(screen.getByText("Ankara-2")).toBeDefined();
  });

  it("tip çipleri sayaçlıdır ve tıklayınca o tip gizlenir", () => {
    renderPage();
    const chip = screen.getByRole("button", { name: /Cihaz Alarmı \(2\)/ });
    fireEvent.click(chip);
    expect(screen.queryByText("Voltage alarmi")).toBeNull();
    expect(screen.queryByText("Sicaklik yuksek")).toBeNull();
    expect(screen.getByText("Oturum acildi")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Tümü \(3\)/ }));
    expect(screen.getByText("Voltage alarmi")).toBeDefined();
  });

  it("arama metni saha adı ve mesaj üzerinde filtreler", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Ara \(saha \/ mesaj\)/), {
      target: { value: "ankara" },
    });
    expect(screen.getByText("Sicaklik yuksek")).toBeDefined();
    expect(screen.queryByText("Voltage alarmi")).toBeNull();
    expect(screen.queryByText("Oturum acildi")).toBeNull();
  });

  it("mute (yok say) localStorage'da kalıcı — tip listeden düşer", () => {
    renderPage();
    const muteButtons = screen.getAllByRole("button", { name: "Yok say" });
    fireEvent.click(muteButtons[0]!);
    expect(screen.queryByText("Voltage alarmi")).toBeNull();
    expect(screen.queryByText("Sicaklik yuksek")).toBeNull();
    expect(screen.getByText("Oturum acildi")).toBeDefined();

    const stored = JSON.parse(localStorage.getItem("boss-notifications-muted") ?? "[]");
    expect(stored).toContain("device_alarm");
  });

  it("unmute tekrar gösterir", () => {
    localStorage.setItem("boss-notifications-muted", JSON.stringify(["device_alarm"]));
    renderPage();
    expect(screen.queryByText("Voltage alarmi")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tekrar göster" }));
    expect(screen.getByText("Voltage alarmi")).toBeDefined();
  });
});
