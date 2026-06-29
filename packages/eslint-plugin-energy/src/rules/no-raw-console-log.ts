import { ESLintUtils } from "@typescript-eslint/utils"

const createRule = ESLintUtils.RuleCreator(
  () => "https://github.com/ilterisYucel/monorepo-bun-starter/blob/main/packages/eslint-plugin-energy/docs/rules",
)

const BACKEND_SERVICE_DIRS = ["web-service", "data-service", "device-service", "demo-backend", "core"]

export const noRawConsoleLog = createRule({
  name: "no-raw-console-log",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Raw console.log calls in backend services risk leaking sensitive data (telemetry, device credentials) into production logs. Use a structured logger or the [ModuleName] prefix convention.",
    },
    schema: [
      {
        type: "object" as const,
        properties: {
          allowPrefixes: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      avoidConsoleLog:
        "Use a structured logger or the [ModuleName] prefix convention instead of raw {{method}} to prevent log injection and data leaks.",
    },
  },
  defaultOptions: [{ allowPrefixes: [] }],
  create(context, [options]) {
    const filename = context.filename ?? context.physicalFilename ?? ""

    const isInBackendService = BACKEND_SERVICE_DIRS.some((dir) => filename.includes(`/${dir}/`))

    // ponytail: only warn in backend service dirs to reduce noise in frontend code
    if (!isInBackendService) return {}

    const logMethods = ["log", "error", "warn", "info", "debug"]

    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "console" &&
          node.callee.property.type === "Identifier" &&
          logMethods.includes(node.callee.property.name)
        ) {
          context.report({
            node,
            messageId: "avoidConsoleLog",
            data: { method: `console.${node.callee.property.name}` },
          })
        }
      },
    }
  },
})
