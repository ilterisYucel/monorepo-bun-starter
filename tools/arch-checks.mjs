#!/usr/bin/env bun
/**
 * Hexagonal mimari sınır denetimi — services/web-service (bağımlılık yönü).
 *
 * Kurallar (katman = dosyanın `src/**` altındaki ilk katman segmenti; tier'lar
 * dahil: `src/tiers/<tier>/<katman>/**` aynı kurala tabidir):
 * - domain: framework/sürücü importu YOK; application/presentation/infrastructure/config importu YOK.
 * - application: framework/sürücü importu YOK; infrastructure/presentation/config importu YOK.
 * - presentation: db/queue sürücüsü YOK; infrastructure importu yalnız `import type` ile;
 *   composition-root istisnaları: `presentation/server.ts`.
 * - infrastructure: presentation importu YOK.
 * - Ratchet: `awilix` YALNIZ composition root'larda (`config/`, `index.ts`,
 *   `tiers/<tier>/registrations.ts`) görünebilir.
 *
 * Kullanım: bun tools/arch-checks.mjs
 * Çıkış kodu: ihlal varsa 1, temizse 0.
 */
import fs from 'node:fs';
import path from 'node:path';

const SERVICE = path.resolve(import.meta.dirname, '../services/web-service');
const SRC = path.join(SERVICE, 'src');

const LAYERS = ['domain', 'application', 'presentation', 'infrastructure'];

const FRAMEWORK_DRIVERS = [
  'fastify',
  '@fastify/',
  'awilix',
  'pg',
  'ioredis',
  'redis',
  'bullmq',
];

const DB_QUEUE_DRIVERS = ['pg', 'ioredis', 'redis', 'bullmq'];

const RULES = {
  domain: {
    forbiddenPackages: FRAMEWORK_DRIVERS,
    forbiddenPaths: [
      '../application',
      '../presentation',
      '../infrastructure',
      '../config',
      'src/application',
      'src/presentation',
      'src/infrastructure',
      'src/config',
    ],
  },
  application: {
    forbiddenPackages: FRAMEWORK_DRIVERS,
    forbiddenPaths: [
      '../infrastructure',
      '../presentation',
      '../config',
      'src/infrastructure',
      'src/presentation',
      'src/config',
    ],
  },
  infrastructure: {
    forbiddenPackages: [],
    forbiddenPaths: ['../presentation', 'src/presentation'],
  },
  presentation: {
    forbiddenPackages: DB_QUEUE_DRIVERS,
    forbiddenPaths: [],
  },
};

/** Composition root'lar: montaj noktalarında katman sınırı aranmaz. */
const COMPOSITION_ROOTS = [
  'config/',
  'index.ts',
  'presentation/server.ts',
];

/** Ratchet: awilix yalnız montaj noktalarında. */
const AWILIX_ALLOWED = (relative) =>
  relative.startsWith('config/') ||
  relative === 'index.ts' ||
  /^tiers\/[^/]+\/registrations\.ts$/.test(relative);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!entry.name.endsWith('.ts')) return [];
    if (entry.name.includes('.test.') || entry.name.includes('.spec.')) return [];
    return [full];
  });
}

function importsOf(source) {
  const results = [];
  // `import type ...` derlemede silinir: adapter adını anmak çalışma-zamanı
  // bağımlılığı yaratmaz (yalnız presentation'da serbesttir).
  const regex =
    /import\s+(type\s+)?[^;]*?\bfrom\s*['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    results.push({
      specifier: match[2] ?? match[3] ?? match[4],
      line: source.slice(0, match.index).split('\n').length,
      typeOnly: Boolean(match[1]),
    });
  }
  return results;
}

function violationMatches(specifier, rule) {
  const pkg = rule.forbiddenPackages.find(
    (forbidden) => specifier === forbidden || specifier.startsWith(forbidden),
  );
  if (pkg) return { kind: 'package', value: pkg };

  const relative = rule.forbiddenPaths.find((forbidden) =>
    specifier.includes(forbidden),
  );
  if (relative) return { kind: 'path', value: relative };

  return null;
}

function layerOf(relative) {
  const segments = relative.split('/');
  return segments.find((segment) => LAYERS.includes(segment)) ?? null;
}

const violations = [];
const exempted = [];

for (const file of walk(SRC)) {
  const relative = path.relative(SRC, file).replaceAll('\\', '/');
  const layer = layerOf(relative);

  if (
    COMPOSITION_ROOTS.some((root) =>
      root.endsWith('/') ? relative.startsWith(root) : relative === root,
    )
  ) {
    exempted.push(relative);
    continue;
  }
  if (!layer) continue;

  const source = fs.readFileSync(file, 'utf8');
  const rule = RULES[layer];

  for (const imp of importsOf(source)) {
    if (layer === 'presentation' && imp.specifier.includes('infrastructure')) {
      // Presentation yalnız TİP taşıyabilir; değer importu sınır ihlalidir.
      if (!imp.typeOnly) {
        violations.push({
          file: relative,
          line: imp.line,
          specifier: imp.specifier,
          layer,
          rule: 'path',
          matched: 'presentation → infrastructure (değer importu)',
        });
      }
      continue;
    }
    const violation = violationMatches(imp.specifier, rule);
    if (violation) {
      violations.push({
        file: relative,
        line: imp.line,
        specifier: imp.specifier,
        layer,
        rule: violation.kind,
        matched: violation.value,
      });
    }
  }

  // Ratchet — awilix yalnız composition root'ta (DI containers inject state, not behavior).
  for (const imp of importsOf(source)) {
    if (imp.specifier === 'awilix' && !AWILIX_ALLOWED(relative)) {
      violations.push({
        file: relative,
        line: imp.line,
        specifier: 'awilix',
        layer,
        rule: 'ratchet',
        matched: 'awilix yalnız composition root (config/, index.ts, tiers/*/registrations.ts)',
      });
    }
  }
}

if (exempted.length > 0) {
  console.log('Exempt (composition root):');
  for (const file of exempted) console.log(`  - ${file}`);
  console.log('');
}

if (violations.length === 0) {
  console.log('✔ Mimari sınır denetimi temiz (domain / application / presentation / infrastructure)');
  process.exit(0);
}

console.error(`✖ ${violations.length} mimari ihlal:\n`);
for (const v of violations) {
  console.error(
    `  ${v.file}:${v.line}  [${v.layer}] "${v.specifier}" (${v.rule}: ${v.matched})`,
  );
}
process.exit(1);
