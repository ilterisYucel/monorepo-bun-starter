import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  () => "https://github.com/ilterisYucel/monorepo-bun-starter/blob/main/packages/eslint-plugin-energy/docs/rules",
)

export const noMathRandom = createRule({
  name: "no-math-random",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Math.random() is not cryptographically secure. Use crypto.getRandomValues() for security contexts (JWT nonces, device auth tokens).",
    },
    schema: [],
    messages: {
      avoidMathRandom:
        "Math.random() is a weak PRNG. Use crypto.getRandomValues() or a CSPRNG for security-sensitive values.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "Math" &&
          node.property.type === "Identifier" &&
          node.property.name === "random"
        ) {
          context.report({ node, messageId: "avoidMathRandom" })
        }
      },
    }
  },
})
