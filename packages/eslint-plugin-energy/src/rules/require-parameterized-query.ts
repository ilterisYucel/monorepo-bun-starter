import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  () => "https://github.com/ilterisYucel/monorepo-bun-starter/blob/main/packages/eslint-plugin-energy/docs/rules",
)

const SQL_PATTERN = /SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER/i

function hasSqlInTemplate(node: TSESTree.TemplateLiteral): boolean {
  for (const quasi of node.quasis) {
    if (SQL_PATTERN.test(quasi.value.raw)) return true
  }
  return false
}

export const requireParameterizedQuery = createRule({
  name: "require-parameterized-query",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "SQL string concatenation with user input is vulnerable to SQL injection. Use pg parameterized queries ($1, $2) or a query builder.",
    },
    schema: [],
    messages: {
      parameterizedQuery:
        "SQL query appears to use string concatenation. Use parameterized queries ($1, $2 syntax with pg) to prevent SQL injection attacks on TimescaleDB.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const arg = node.arguments[0]
        if (!arg || arg.type !== "TemplateLiteral") return
        if (arg.expressions.length === 0) return

        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.property.type !== "Identifier" ||
          (node.callee.property.name !== "query" && node.callee.property.name !== "execute")
        )
          return

        if (hasSqlInTemplate(arg)) {
          context.report({ node, messageId: "parameterizedQuery" })
        }
      },
    }
  },
})
