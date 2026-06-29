import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  () => "https://github.com/ilterisYucel/monorepo-bun-starter/blob/main/packages/eslint-plugin-energy/docs/rules",
)

export const requireTimeout = createRule({
  name: "require-timeout",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Infinite loops and polling without timeouts risk resource exhaustion in device communication (Modbus polling, MQTT subscribers). Add circuit breakers or max iterations.",
    },
    schema: [],
    messages: {
      requireTimeout:
        "{{construct}} without a timeout/recovery mechanism risks resource exhaustion. Add a max iteration limit, setTimeout, or circuit breaker pattern for device communication loops.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          (node.callee.name === "setInterval" || node.callee.name === "setTimeout")
        ) {
          // ponytail: check that the parent scope eventually calls clearInterval/clearTimeout
          return
        }
      },

      WhileStatement(node) {
        if (node.test.type === "Literal" && node.test.value === true) {
          context.report({
            node,
            messageId: "requireTimeout",
            data: { construct: "while(true)" },
          })
        }
      },

      ForStatement(node) {
        if (!node.test && !node.update) {
          context.report({
            node,
            messageId: "requireTimeout",
            data: { construct: "for(;;)" },
          })
        }
      },
    }
  },
})
