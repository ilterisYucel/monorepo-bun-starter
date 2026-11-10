import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";
import { noMathRandom } from "./no-math-random";
import { noRawConsoleLog } from "./no-raw-console-log";
import { requireParameterizedQuery } from "./require-parameterized-query";
import { requireTimeout } from "./require-timeout";

// RuleTester, test runner'ı global `describe`/`it` üzerinden kullanır.
RuleTester.describe = describe as typeof RuleTester.describe;
RuleTester.it = it as typeof RuleTester.it;
RuleTester.itOnly = it.only as typeof RuleTester.itOnly;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("eslint-plugin-energy kuralları", () => {
  tester.run("no-math-random", noMathRandom, {
    valid: ["crypto.getRandomValues(new Uint32Array(1));"],
    invalid: [
      {
        code: "const x = Math.random();",
        errors: [{ messageId: "avoidMathRandom" }],
      },
    ],
  });

  tester.run("no-raw-console-log", noRawConsoleLog, {
    valid: [
      {
        code: 'console.log("[DeviceService] başladı");',
        filename: "services/device-service/src/x.ts",
        options: [{ allowPrefixes: ["["] }],
      },
      {
        code: 'console.log("frontend serbest");',
        filename: "apps/site/src/x.ts",
        options: [{ allowPrefixes: ["["] }],
      },
    ],
    invalid: [
      {
        code: 'console.warn("prefixsiz mesaj");',
        filename: "services/web-service/src/x.ts",
        options: [{ allowPrefixes: ["["] }],
        errors: [{ messageId: "avoidConsoleLog" }],
      },
    ],
  });

  tester.run("require-parameterized-query", requireParameterizedQuery, {
    valid: ['db.query("SELECT * FROM telemetry WHERE device_id = $1", [id]);'],
    invalid: [
      {
        code: "db.query(`SELECT * FROM telemetry WHERE device_id = ${id}`);",
        errors: [{ messageId: "parameterizedQuery" }],
      },
    ],
  });

  tester.run("require-timeout", requireTimeout, {
    valid: ["for (let i = 0; i < 10; i++) {}"],
    invalid: [
      { code: "for (;;) {}", errors: [{ messageId: "requireTimeout" }] },
      { code: "while (true) {}", errors: [{ messageId: "requireTimeout" }] },
    ],
  });
});
