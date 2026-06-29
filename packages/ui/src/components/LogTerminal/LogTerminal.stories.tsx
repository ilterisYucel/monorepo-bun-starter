import type { Meta, StoryObj } from "@storybook/react";
import type { LogEntry } from "@gd-monorepo/shared-types";
import { LogTerminal } from "./LogTerminal";
import { createMockLogProvider, createMockLogEntry } from "../../__stories__/mocks/factories";

const meta: Meta<typeof LogTerminal> = {
  title: "Components/LogTerminal",
  component: LogTerminal,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof LogTerminal>;

const mixedLogs: LogEntry[] = [
  createMockLogEntry({ type: "info", source: "system", message: "Sistem başlatıldı" }),
  createMockLogEntry({ type: "success", source: "user", message: "BSC-1 şarj moduna geçirildi" }),
  createMockLogEntry({ type: "info", source: "system", message: "Modbus bağlantısı kuruldu" }),
  createMockLogEntry({ type: "warning", source: "system", message: "BSC-2 sıcaklık eşiği aşıldı", details: "Sıcaklık: 52°C, Eşik: 50°C" }),
  createMockLogEntry({ type: "success", source: "user", message: "Raf konfigürasyonu güncellendi" }),
  createMockLogEntry({ type: "error", source: "system", message: "TMS-3 haberleşme hatası", details: "Timeout: 5000ms" }),
  createMockLogEntry({ type: "info", source: "user", message: "Log görüntüleme filtresi değiştirildi" }),
  createMockLogEntry({ type: "success", source: "system", message: "TimescaleDB yazma başarılı" }),
  createMockLogEntry({ type: "warning", source: "user", message: "Manuel deşarj limiti düşük", details: "Limit: %10" }),
  createMockLogEntry({ type: "error", source: "system", message: "Redis bağlantısı kesildi", details: "Yeniden bağlanılıyor..." }),
];

export const MixedLogs: Story = {
  args: {
    provider: createMockLogProvider(mixedLogs),
    maxHeight: 400,
  },
};

export const Empty: Story = {
  args: {
    provider: createMockLogProvider([]),
  },
};

export const Overflow: Story = {
  args: {
    provider: createMockLogProvider(
      Array.from({ length: 55 }, (_, i) =>
        createMockLogEntry({
          type: (["info", "success", "warning", "error"] as const)[i % 4],
          source: (["system", "user"] as const)[i % 2],
          message: `Log kaydı #${i + 1} - ${i % 4 === 0 ? "bilgi" : i % 4 === 1 ? "başarılı" : i % 4 === 2 ? "uyarı" : "hata"}`,
        }),
      ),
    ),
    maxHeight: 400,
  },
};
