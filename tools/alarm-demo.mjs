#!/usr/bin/env bun
/**
 * alarm-demo.mjs — cihaz alarm akışı gözle doğrulama demosu (Faz 0 eki).
 *
 * Senaryo: 5 poll (fault=1,1,1,0,1) → dedup state makinesi yalnızca
 * yükselen/düşen kenarlarda log üretir. Beklenen: 3 imzalı log satırı
 * (device_alarm → device_alarm_cleared → device_alarm) ve geçerli tamper
 * zinciri.
 *
 * Kullanım:
 *   bun tools/alarm-demo.mjs
 *
 * Çıktı: tmp dizininde bir dosya logu — satır sayısı, eventCode listesi ve
 * verifyChain sonucu. Doğrulama dokümanı E7 kanıtı bu çıktıya dayanır.
 */

import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, rm } from "node:fs/promises";
import { TamperLogger, FileSink, verifyChain } from "../packages/core/src/logging/index.ts";
import { AlarmTransitionDetector, alarmSamples } from "../services/device-service/src/alarm-transition-detector.ts";

const dir = await mkdtemp(join(tmpdir(), "alarm-demo-"));
const path = join(dir, "app.log");
const logger = new TamperLogger({
  signingKey: "demo-key",
  service: "device-service",
  sinks: [new FileSink({ path })],
  batchSize: 1,
});

const detector = new AlarmTransitionDetector();
const rules = [
  { telemetry: "BSC Fault", severity: "error", description: "BSC arızası" },
];

async function poll(deviceId, faultValue) {
  const telemetry = [
    {
      name: "BSC Fault",
      value: faultValue,
      timestamp: new Date().toISOString(),
      deviceId,
    },
  ];
  const samples = alarmSamples(rules, telemetry);
  for (const t of detector.detect(deviceId, samples)) {
    if (t.kind === "set") {
      await logger.log({
        level: "error",
        category: "app",
        eventCode: "device_alarm",
        message: `Cihaz alarmi aktif: ${t.name}`,
        context: { deviceId, alarm: t.name, severity: t.severity },
      });
    } else {
      await logger.log({
        level: "info",
        category: "app",
        eventCode: "device_alarm_cleared",
        message: `Cihaz alarmi kapandi: ${t.name}`,
        context: { deviceId, alarm: t.name },
      });
    }
  }
}

// Senaryo: 1 → 1 → 1 → 0 → 1 (5 poll)
await poll("bsc-1", 1);
await poll("bsc-1", 1);
await poll("bsc-1", 1);
await poll("bsc-1", 0);
await poll("bsc-1", 1);
await logger.close();

const content = await readFile(path, "utf8");
const events = content.trim().split("\n").map((l) => JSON.parse(l));
console.log(
  `Toplam log satiri: ${events.length} (5 poll'da beklenen: 3 — 2x device_alarm + 1x cleared; dedup sessiz kaldi)`,
);
for (const e of events) {
  console.log(`  seq=${e.seq} ${e.eventCode} (${e.level})`);
}
const v = verifyChain(events, "demo-key");
console.log(v.valid ? "[OK] Imza zinciri gecerli" : "[FAIL] Zincir bozuk");

await rm(dir, { recursive: true, force: true });
process.exit(v.valid && events.length === 3 ? 0 : 1);
