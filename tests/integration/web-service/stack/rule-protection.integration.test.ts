import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import {
  FIELD_URL,
  CONTAINER_URL,
  CONTAINER_INJECT_URL,
  assertHealthy,
  login,
  containerRows,
  valueOf,
  inject,
  sleep,
  normalizeContainer,
  ensureStackReady,
  managementContainerName,
  type Row,
} from "../helpers";

/**
 * Kural → komut → fiziksel etki zinciri entegrasyonu (v2/dev).
 * v2/dev container rules.json gerçek 43 kural setini taşır (DENETIM-ESLEME-v2).
 * Simülatör arızaları DebugInjector (:15590) ile enjekte edilir.
 * Bulgular: FL-02/05/07/08/11, C1/C2, A2, M2, M7.
 *
 * Kural motoru kenar-tetiklemeli + cooldown'lıdır ve durumu bellekte tutar.
 * Testleri tekrarlanabilir kılmak için suite başında container
 * management-service yeniden başlatılır (kural durumu sıfırlanır).
 */

let fieldToken = "";
let containerToken = "";

beforeAll(async () => {
  await assertHealthy(FIELD_URL);
  await assertHealthy(CONTAINER_URL);
  resetRuleEngine();
  fieldToken = await login(FIELD_URL);
  containerToken = await login(CONTAINER_URL);
  await ensureStackReady(fieldToken, containerToken);
  await sleep(2000);
});

// Paylaşımlı stack temizliği: enjeksiyonları, BSC'yi ve şalterleri normale döndür.

/** Container kural motorunu yeniden başlatır (in-memory kural durumu sıfırlanır). */
function resetRuleEngine(): void {
  try {
    execFileSync("docker", ["restart", managementContainerName()], {
      stdio: "ignore",
    });
  } catch (error) {
    throw new Error(
      `Kural motoru sıfırlanamadı (docker restart): ${(error as Error).message}. ` +
        "Stack 'bun run dev:stack:up' ile çalışıyor olmalı.",
    );
  }
  // Servis başlangıcı + ilk değerlendirme turu.
  execFileSync("sh", ["-c", "sleep 8"], { stdio: "ignore" });
}

async function rows(): Promise<Row[]> {
  return containerRows(fieldToken);
}

async function deviceValue(deviceId: string, name: string): Promise<number> {
  const all = await rows();
  return valueOf(all.filter((r) => r.deviceId === deviceId), name);
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs: number,
  intervalMs = 2000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await sleep(intervalMs);
  }
  return false;
}

async function command(deviceId: string, cmd: string): Promise<void> {
  await fetch(`${CONTAINER_URL}/api/commands/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${containerToken}` },
    body: JSON.stringify({ deviceId, command: cmd }),
  });
}

async function restoreBreakers(): Promise<void> {
  await Promise.all([command("CB-1", "close"), command("CB-2", "close")]);
  await sleep(4000);
}

/** Kural motoru log'u (son N saniye) — kural/aksiyon kanıtı. */
function ruleLogsSince(seconds: number): string {
  try {
    return execFileSync(
      "docker",
      ["logs", "--since", `${seconds}s`, managementContainerName()],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    // docker logs stderr'a yazar; execFileSync hata fırlatırsa stdout+stderr birleşir.
    const e = error as { stdout?: string; stderr?: string };
    return `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
}

describe("koruma kural zinciri (kural → komut → fiziksel etki)", () => {


  it(
    "FL-07: batarya kapısı açık → oda ışığı yanar",
    async () => {
      await inject(CONTAINER_INJECT_URL, "CONTROL-PANEL-IO-1", "battery_door_close");
      await sleep(6000);
      expect(
        await inject(CONTAINER_INJECT_URL, "CONTROL-PANEL-IO-1", "battery_door_open"),
      ).toBe(true);
      const ok = await waitFor(
        async () => (await deviceValue("CONTROL-PANEL-IO-1", "Battery Room Light")) === 1,
        25000,
      );
      expect(ok).toBe(true);
      await inject(CONTAINER_INJECT_URL, "CONTROL-PANEL-IO-1", "battery_door_close");
    },
    50000,
  );

  it(
    "FL-11: izolasyon arızası → DC şalterler açılır",
    async () => {
      await restoreBreakers();
      await inject(CONTAINER_INJECT_URL, "IMD-1", "healthy");
      await sleep(6000);
      expect(await inject(CONTAINER_INJECT_URL, "IMD-1", "fault")).toBe(true);
      const ok = await waitFor(async () => (await deviceValue("CB-1", "Is Open")) === 1, 30000);
      expect(ok).toBe(true);
      await inject(CONTAINER_INJECT_URL, "IMD-1", "healthy");
    },
    60000,
  );




});

describe("F2.6 — yangın C&E ve IMD eşiği", () => {
  it(
    "Yangın (Fire DI) → BSC Emergency + HVAC force_off",
    async () => {
      // Kenar sıfırlama + ön koşul: BSC Normal olmalı — EMERGENCY yalnız
      // Normal/NPS/Manual'den kabul edilir (Rev AF ack tablosu); durmuş/emergency
      // BSC'de kural aksiyonu reddedilir. `normalizeContainer` yangın bitini de
      // nominal'e çeker (kenar 1→0→1).
      await normalizeContainer(containerToken);
      await sleep(3000);
      expect(await inject(CONTAINER_INJECT_URL, "CONTROL-PANEL-IO-1", "fire")).toBe(true);
      const ok = await waitFor(async () => (await deviceValue("BSC-1", "BSC State")) === 6, 25000); // EMERGENCY
      expect(ok).toBe(true);
      await inject(CONTAINER_INJECT_URL, "CONTROL-PANEL-IO-1", "nominal");
      await command("BSC-1", "stop");
      await command("BSC-2", "stop");
    },
    120_000,
  );

  it(
    "IMD 200 kΩ (uyarı) → Prewarning 4, Insulation Alarm 0 (FL-11 tetiklenmez)",
    async () => {
      expect(await inject(CONTAINER_INJECT_URL, "IMD-1", "warning")).toBe(true);
      const ok = await waitFor(async () => (await deviceValue("IMD-1", "Insulation Prewarning")) === 4, 20000);
      expect(ok).toBe(true);
      expect(await deviceValue("IMD-1", "Insulation Alarm")).toBe(0);
      await inject(CONTAINER_INJECT_URL, "IMD-1", "healthy");
    },
    40_000,
  );
});
