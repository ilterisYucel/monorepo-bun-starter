import { noMathRandom } from "./rules/no-math-random"
import { noRawConsoleLog } from "./rules/no-raw-console-log"
import { requireParameterizedQuery } from "./rules/require-parameterized-query"
import { requireTimeout } from "./rules/require-timeout"

export const rules = {
  "no-math-random": noMathRandom,
  "no-raw-console-log": noRawConsoleLog,
  "require-parameterized-query": requireParameterizedQuery,
  "require-timeout": requireTimeout,
}

export { noMathRandom, noRawConsoleLog, requireParameterizedQuery, requireTimeout }
