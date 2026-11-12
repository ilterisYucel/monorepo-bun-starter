#!/usr/bin/env node
/**
 * compare.mjs — iki PNG arasındaki piksel farkını raporlar (T-45).
 *
 * Kullanım:
 *   node tests/visual/compare.mjs <figma.png> <render.png> [--threshold 1]
 *   node tests/visual/compare.mjs --self-test
 *
 * Çıktı: farklı piksel oranı (%) ve eşik karşılaştırması. Sadece 8-bit
 * RGB/RGBA, non-interlaced PNG desteklenir (Figma + tarayıcı ekran görüntüsü).
 */

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const decodePng = (buffer) => {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("PNG imzası geçersiz");

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8) throw new Error(`desteklenmeyen bit derinliği: ${bitDepth}`);
  if (interlace !== 0) throw new Error("interlaced PNG desteklenmiyor");
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error(`desteklenmeyen renk tipi: ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const rowIn = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const rowOut = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? rowOut[x - channels] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= channels ? prev[x - channels] : 0;
      const value = rowIn[x] ?? 0;
      rowOut[x] =
        filter === 0
          ? value
          : filter === 1
            ? (value + left) & 0xff
            : filter === 2
              ? (value + up) & 0xff
              : filter === 3
                ? (value + ((left + up) >> 1)) & 0xff
                : (value + paeth(left, up, upLeft)) & 0xff;
    }
  }

  return { width, height, channels, pixels };
};

const compare = (a, b, thresholdPercent) => {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  let different = 0;
  let total = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ia = (y * a.width + x) * a.channels;
      const ib = (y * b.width + x) * b.channels;
      const same =
        Math.abs(a.pixels[ia] - b.pixels[ib]) <= 2 &&
        Math.abs(a.pixels[ia + 1] - b.pixels[ib + 1]) <= 2 &&
        Math.abs(a.pixels[ia + 2] - b.pixels[ib + 2]) <= 2;
      if (!same) different += 1;
      total += 1;
    }
  }

  const ratio = total === 0 ? 100 : (different / total) * 100;
  const sizePenalty =
    a.width !== b.width || a.height !== b.height
      ? ((Math.abs(a.width - b.width) + Math.abs(a.height - b.height)) / (a.width + a.height)) * 100
      : 0;
  const score = ratio + sizePenalty;
  return { ratio, sizePenalty, score, pass: score <= thresholdPercent };
};

const selfTest = () => {
  // 1x1 kırmızı PNG (base64) — decoder doğrulaması.
  const onePixel =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const decoded = decodePng(Buffer.from(onePixel, "base64"));
  if (decoded.width !== 1 || decoded.height !== 1) throw new Error("self-test: boyut hatalı");
  const same = compare(decoded, decoded, 0);
  if (!same.pass) throw new Error("self-test: aynı görsel farklı raporlandı");
  console.log("compare.mjs self-test: OK");
};

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  selfTest();
} else {
  const files = args.filter((arg) => !arg.startsWith("--"));
  const thresholdIndex = args.indexOf("--threshold");
  const threshold = thresholdIndex >= 0 ? Number(args[thresholdIndex + 1]) : 1;
  if (files.length !== 2) {
    console.error("Kullanım: node tests/visual/compare.mjs <figma.png> <render.png> [--threshold 1]");
    process.exit(2);
  }
  const result = compare(decodePng(readFileSync(files[0])), decodePng(readFileSync(files[1])), threshold);
  console.log(
    `pixel diff: ${result.ratio.toFixed(3)} % · boyut cezası: ${result.sizePenalty.toFixed(3)} % · ` +
      `toplam: ${result.score.toFixed(3)} % (eşik ${threshold} %) → ${result.pass ? "PASS" : "FAIL"}`,
  );
  process.exit(result.pass ? 0 : 1);
}
