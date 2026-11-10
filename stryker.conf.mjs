/**
 * StrykerJS yapılandırması — mutasyon testi kapısı (AGENTS.md "Geliştirme İş Akışı" Aşama 3).
 *
 * Paket bazında çalıştırılır: `bun run test:mutation` (tools/mutation-changed.mjs) değişen
 * dosyaların paketlerinde `stryker run <bu dosya> --mutate` çağırır; mutate listesi CLI'dan gelir.
 * Eşik: MUTATION_BREAK env (varsayılan 80; güvenlik-kritik modüllerde 90).
 *
 * ponytail: tek kök config; vitest workspace kökten mutasyona sokulmaz (paket bazında koşulur).
 */
export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { related: true },
  mutate: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/**/index.ts",
    "!src/**/*.d.ts",
  ],
  coverageAnalysis: "perTest",
  reporters: ["clear-text", "progress"],
  thresholds: { high: 90, low: 80, break: Number(process.env.MUTATION_BREAK ?? 80) },
  incremental: true,
  timeoutMS: 60000,
  concurrency: 2,
};
