#!/usr/bin/env bun
/**
 * rtu-loopback-check.mjs — RTU taşıma katmanının donanımsız kontrolü.
 *
 * `socat` ile birbirine bağlı iki sanal seri port (PTY çifti) kurar:
 *   PTY-A ↔ PTY-B
 * PTY-B'de jsmodbus `ModbusRTUServer` (holding register'lar dolu), PTY-A'da
 * gerçek `ModbusRtuClient` (bun-serialport + `SerialSocketAdapter`) çalışır.
 * termios FFI katmanı (open/read/write) gerçek UART ile aynı kernel yolundan
 * geçer — tek fark fiziksel hattın yerini PTY'nin alması.
 *
 * Doğrulananlar: port açılışı ('open' + isOpen), RTU çerçeveleme/CRC, register
 * okuma, register yazma + geri okuma. Tümü geçerse exit 0.
 *
 * Kullanım: bun tools/rtu-loopback-check.mjs
 * Ön koşul: `socat` (Debian/Ubuntu: apt install socat)
 */

import { spawn, spawnSync } from "node:child_process";
import { ModbusRTUServer } from "jsmodbus";
import { SerialPort as BunSerialPort } from "bun-serialport";
import { ModbusRtuClient } from "../packages/core/src/modbus/client-rtu.ts";
import { SerialSocketAdapter } from "../packages/core/src/modbus/serial-socket-adapter.ts";

const SLAVE_ID = 1;
const SEED = [
  [0, 1234],
  [1, 5678],
];

let failed = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
}

function hasSocat() {
  return spawnSync("socat", ["-V"], { encoding: "utf8" }).status === 0;
}

/** socat PTY çiftini başlatır; iki /dev/pts yolunu döner. */
function startPtyPair() {
  const proc = spawn("socat", ["-d", "-d", "pty,raw,echo=0", "pty,raw,echo=0"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  return new Promise((resolve, reject) => {
    let out = "";
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`socat PTY çifti açılamadı: ${out.trim()}`));
    }, 5000);
    proc.stderr.on("data", (chunk) => {
      out += chunk.toString();
      const paths = [...out.matchAll(/PTY is (\/dev\/pts\/\d+)/g)].map((m) => m[1]);
      if (paths.length >= 2) {
        clearTimeout(timer);
        resolve({ proc, paths: [paths[0], paths[1]] });
      }
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`socat erken kapandı (code=${code}): ${out.trim()}`));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!hasSocat()) {
    console.error("socat bulunamadi — kurulum: sudo apt install socat");
    process.exit(2);
  }

  const { proc, paths } = await startPtyPair();
  const [clientPath, serverPath] = paths;
  console.log(`[rtu-check] PTY-A (client) = ${clientPath}, PTY-B (server) = ${serverPath}`);

  const serverSocket = new SerialSocketAdapter(
    new BunSerialPort({ path: serverPath, baudRate: 19200, autoOpen: false }),
  );
  serverSocket.open();
  const server = new ModbusRTUServer(serverSocket, {
    holding: Buffer.alloc(1024),
    input: Buffer.alloc(1024),
    coils: Buffer.alloc(1024),
    discrete: Buffer.alloc(1024),
  });
  for (const [address, value] of SEED) {
    server.holding.writeUInt16BE(value, address * 2);
  }

  const client = new ModbusRtuClient({
    path: clientPath,
    baudRate: 19200,
    slaveId: SLAVE_ID,
    timeout: 3000,
  });

  try {
    await sleep(300);
    await client.connect();
    check("1) RTU client bağlandı (bun-serialport 'open' + isOpen)", client.isConnected());

    const seeded = await client.readHoldingRegisters(0, SEED.length);
    check(
      "2) readHoldingRegisters → tohum değerleri",
      JSON.stringify(seeded) === JSON.stringify(SEED.map(([, v]) => v)),
      JSON.stringify(seeded),
    );

    await client.writeSingleRegister(1, 4321);
    const afterWrite = await client.readHoldingRegisters(1, 1);
    check("3) writeSingleRegister + geri okuma", afterWrite[0] === 4321, `[${afterWrite}]`);

    const coils = await client.readCoils(0, 2);
    check("4) readCoils → sunucu yanıtı alındı", Array.isArray(coils), `[${coils}]`);
  } finally {
    await client.disconnect().catch(() => undefined);
    serverSocket.close();
    proc.kill("SIGTERM");
  }

  if (failed > 0) {
    console.error(`\n${failed} kontrol BAŞARISIZ`);
    process.exit(1);
  }
  console.log("\nTÜM KONTROLLER GEÇTİ");
}

await main();
