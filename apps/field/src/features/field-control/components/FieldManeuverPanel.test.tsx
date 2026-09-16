import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TranslationProvider, TR_DICT, EN_DICT } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { FieldManeuverPanel } from "./FieldManeuverPanel";
import { fieldControlApi } from "../services/fieldControlApi";
import { FIELD_TR_DICT } from "../../../i18n/tr";
import { FIELD_EN_DICT } from "../../../i18n/en";

/**
 * FieldManeuverPanel sözleşmesi (WS4 panel gerçekleştirmesi):
 *
 * - Kart seti REV.01 kataloğundan üretilir (gizli FL-06/07/10 YOKTUR).
 * - PCS hedef listesi gerçek konteyner snapshot'larından türetilir
 *   (useContainerData — PCS- önekli deviceId'ler).
 * - Çalıştır → fieldControlApi.executeMulti (çözümlenmiş adımlar + mode).
 * - Tüm sonuçlar success → kart "success"; aksi "failed" (Tekrar Dene).
 * - API hatası → "failed" (throw yutulur, kart kilitlenmez).
 */

const pcsTelemetry = (deviceId: string): TelemetryData => ({
  deviceId,
  name: "Status",
  value: 1,
  timestamp: new Date().toISOString(),
});

const containers = [
  {
    containerId: "c-1",
    connectionStatus: "connected" as const,
    latestTelemetry: [pcsTelemetry("PCS-1")],
    layout: { x: 0, y: 0, z: 0 },
    lastSeenAt: new Date().toISOString(),
  },
  {
    containerId: "c-2",
    connectionStatus: "connected" as const,
    latestTelemetry: [pcsTelemetry("PCS-2")],
    layout: { x: 0, y: 1, z: 0 },
    lastSeenAt: new Date().toISOString(),
  },
];

vi.mock("../../containers/hooks/useContainerData", () => ({
  useContainerData: () => ({
    containers,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../services/fieldControlApi", () => ({
  fieldControlApi: {
    executeMulti: vi.fn(),
  },
}));

const executeMultiMock = vi.mocked(fieldControlApi.executeMulti);

function renderPanel(): ReturnType<typeof render> {
  return render(
    <TranslationProvider
      dictionaries={{ tr: TR_DICT, en: EN_DICT }}
      extraKeys={{ tr: FIELD_TR_DICT, en: FIELD_EN_DICT }}
      defaultLocale="tr"
    >
      <FieldManeuverPanel />
    </TranslationProvider>,
  );
}

describe("FieldManeuverPanel (gerçek yürütme)", () => {
  beforeEach(() => {
    executeMultiMock.mockReset();
  });

  it("REV.01 kartlarını üretir; gizli manevralar YOKTUR", () => {
    renderPanel();
    expect(screen.getByText("FL-01: Saha Başlatma")).toBeTruthy();
    expect(screen.getByText("FL-05: Acil Durdurma")).toBeTruthy();
    expect(screen.queryByText(/FL-06/)).toBeNull();
    expect(screen.queryByText(/FL-07/)).toBeNull();
  });

  it("Çalıştır → PCS adımları executeMulti'ye çözümlenmiş gider", async () => {
    executeMultiMock.mockResolvedValue([
      { deviceId: "PCS-1", command: "start", success: true },
      { deviceId: "PCS-2", command: "start", success: true },
    ]);
    renderPanel();

    fireEvent.click(screen.getAllByText("▶ Çalıştır")[0]!);

    expect(executeMultiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        commands: [
          { deviceId: "PCS-1", command: "start", params: undefined },
          { deviceId: "PCS-2", command: "start", params: undefined },
        ],
        mode: "parallel",
        onFailure: "continue",
      }),
    );
    await screen.findAllByText("▶ Çalıştır");
    expect(screen.getAllByText("▶ Çalıştır").length).toBeGreaterThan(0);
  });

  it("kısmi başarısızlık → kart failed (Tekrar Dene görünür)", async () => {
    executeMultiMock.mockResolvedValue([
      { deviceId: "PCS-1", command: "stop", success: true },
      { deviceId: "PCS-2", command: "stop", success: false, reason: "Validation timeout" },
    ]);
    renderPanel();

    fireEvent.click(screen.getAllByText("▶ Çalıştır")[3]!);
    await screen.findByText("Tekrar Dene");
  });

  it("API hatası → failed durumu (throw yutulur)", async () => {
    executeMultiMock.mockRejectedValue(new Error("network down"));
    renderPanel();

    fireEvent.click(screen.getAllByText("▶ Çalıştır")[0]!);
    await screen.findByText("Tekrar Dene");
  });
});
