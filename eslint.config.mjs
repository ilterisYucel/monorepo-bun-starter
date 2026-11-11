// Kök ESLint yapılandırması — güvenlik kuralları (OWASP ASVS Level 2 hizası).
// Kapsam: backend servisleri + paylaşılan paketler (frontend app'ler kendi lint'lerini korur).
// Kural kaynağı: tools/eslint-plugin-energy (üretim tool'u).
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import { rules as energyRules } from "./tools/eslint-plugin-energy/dist/index.js";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/storybook-static/**",
      "**/build/**",
      "**/coverage/**",
      "**/test-results/**",
      "**/.nx/**",
      "**/.stryker-tmp/**",
      "**/*.d.ts",
    ],
  },
  {
    files: [
      "services/**/*.{ts,tsx,mts,cts}",
      "packages/**/*.{ts,tsx,mts,cts}",
    ],
    languageOptions: {
      parser: tseslint.parser,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      energy: { rules: energyRules },
      // inline disable direktiflerinin çözülmesi için tanımlı; kurallar app config'lerinde koşar.
      "react-hooks": reactHooks,
    },
    rules: {
      "energy/no-math-random": "error",
      "energy/no-raw-console-log": ["error", { allowPrefixes: ["["] }],
      "energy/require-parameterized-query": "error",
      "energy/require-timeout": "error",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    // Test dosyaları: Math.random ve sonsuz döngü test iskelesidir, güvenlik yüzeyi değildir.
    files: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx", "**/*.spec.tsx"],
    rules: {
      "energy/no-math-random": "off",
      "energy/require-timeout": "off",
    },
  },
];
