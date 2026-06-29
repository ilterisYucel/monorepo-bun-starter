import { tool } from "@opencode-ai/plugin"

export default tool({
  description:
    "Query SonarCloud API for code quality and security issues in the monorepo. " +
    "Returns list of issues with severity, rule, file path, line, and message. " +
    "Uses SONAR_TOKEN and SONARCLOUD_ORG from environment.",
  args: {
    component: tool.schema
      .string()
      .optional()
      .describe("Project component key (e.g. 'gd-pms-monorepo' or a sub-module key)"),
    severities: tool.schema
      .string()
      .optional()
      .describe("Comma-separated severity levels: BLOCKER,CRITICAL,MAJOR,MINOR,INFO"),
    types: tool.schema
      .string()
      .optional()
      .describe("Comma-separated issue types: BUG,VULNERABILITY,CODE_SMELL"),
    pageSize: tool.schema.number().optional().describe("Results per page (default 50, max 500)"),
  },
  async execute(args, context) {
    const token = process.env.SONAR_TOKEN
    const org = process.env.SONARCLOUD_ORG

    if (!token || !org) {
      return "SONAR_TOKEN or SONARCLOUD_ORG not set. Set them via environment variables or secrets."
    }

    const component = args.component || "gd-pms-monorepo"
    const severities = args.severities || "BLOCKER,CRITICAL"
    const types = args.types || "BUG,VULNERABILITY"
    const pageSize = args.pageSize || 50

    const url = new URL("https://sonarcloud.io/api/issues/search")
    url.searchParams.set("componentKeys", component)
    url.searchParams.set("severities", severities)
    url.searchParams.set("types", types)
    url.searchParams.set("ps", String(pageSize))
    url.searchParams.set("s", "SEVERITY")
    url.searchParams.set("asc", "false")

    const auth = Buffer.from(`${token}:`).toString("base64")

    const resp = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    })

    if (!resp.ok) {
      return `SonarCloud API error: HTTP ${resp.status} ${resp.statusText}`
    }

    const data = await resp.json()
    const issues = data.issues || []

    if (issues.length === 0) {
      return `No ${severities} ${types} issues found in ${component}.`
    }

    const lines = [`${issues.length} issues (total: ${data.total || issues.length}):`]
    for (const issue of issues) {
      lines.push(
        `  [${issue.severity}] ${issue.type} | ${issue.component.split(":").pop()}:${issue.line || "N/A"} | ${issue.message}`,
      )
    }

    return lines.join("\n")
  },
})
