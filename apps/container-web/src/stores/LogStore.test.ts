import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useLogStore } from "./LogStore";
import { logsApi } from "../features/logs/services/logsApi";

/**
 * LogStore sözleşmesi (2026-08-30 — T2):
 * - addLog: yeni log BAŞA eklenir; MAX 200 ile sınırlanır; backend'e
 *   gönderilir (başarıda sunucu kaydı local ile DEĞİŞTİRİLİR — başarısızlıkta
 *   local kalır).
 * - localStorage yazımı DEBOUNCED'dır: son yazımdan en az ~2 sn sonra tek
 *   seferde yazılır (24/7 çalışmada storage aşınması önlenir).
 */

vi.mock("../features/logs/services/logsApi", () => ({
  logsApi: {
    create: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
  },
}));

const entry = (message: string) => ({
  type: "info" as const,
  source: "system" as const,
  message,
  details: "",
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useLogStore.setState({ logs: [] });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LogStore (T2)", () => {
  it("can be imported without localStorage errors (karakterizasyon)", async () => {
    const storeModule = await vi.importActual<typeof import("./LogStore")>(
      "./LogStore",
    );
    expect(storeModule.useLogStore).toBeDefined();
    expect(typeof storeModule.useLogStore.getState).toBe("function");
  });

  it("addLog yeni girişi başa ekler ve backend'e gönderir", async () => {
    useLogStore.getState().addLog(entry("ilk"));
    expect(useLogStore.getState().logs[0]?.message).toBe("ilk");
    expect(logsApi.create).toHaveBeenCalledTimes(1);
  });

  it("MAX 200 sınırı: en eski giriş atılır", () => {
    for (let i = 0; i < 205; i += 1) {
      useLogStore.getState().addLog(entry(`log-${i}`));
    }
    const logs = useLogStore.getState().logs;
    expect(logs).toHaveLength(200);
    expect(logs[0]?.message).toBe("log-204");
    expect(logs[199]?.message).toBe("log-5");
  });

  it("backend başarılı dönüşünde sunucu kaydı local girişle DEĞİŞTİRİLİR", async () => {
    vi.mocked(logsApi.create).mockResolvedValue({
      id: "srv-1",
      timestamp: "2026-08-30T12:00:00Z",
      type: "info",
      source: "system",
      message: "ilk",
      details: "",
    });
    useLogStore.getState().addLog(entry("ilk"));
    await vi.advanceTimersByTimeAsync(0);
    expect(useLogStore.getState().logs[0]?.id).toBe("srv-1");
  });

  it("localStorage yazımı debounced: 2 sn içinde ardışık addLog TEK yazım üretir", () => {
    useLogStore.getState().addLog(entry("a"));
    vi.advanceTimersByTime(500);
    useLogStore.getState().addLog(entry("b"));
    vi.advanceTimersByTime(500);
    useLogStore.getState().addLog(entry("c"));
    expect(localStorage.getItem("log-storage")).toBeNull();

    vi.advanceTimersByTime(2001);
    const raw = localStorage.getItem("log-storage");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? "{}");
    const messages = (parsed.state?.logs ?? []).map((l: { message: string }) => l.message);
    expect(messages).toContain("a");
    expect(messages).toContain("b");
    expect(messages).toContain("c");
  });

  it("addLog backend hatasını yutar — local giriş korunur", async () => {
    vi.mocked(logsApi.create).mockRejectedValue(new Error("sunucu yok"));
    useLogStore.getState().addLog(entry("kalici"));
    await vi.advanceTimersByTimeAsync(0);
    expect(useLogStore.getState().logs[0]?.message).toBe("kalici");
  });
});
