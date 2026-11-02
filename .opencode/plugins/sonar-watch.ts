// OpenCode V2 plugin: surfaces SonarCloud quality-gate status after each session.
// Requires SONAR_TOKEN and SONARCLOUD_ORG environment variables.

import { Plugin } from "@opencode/plugin"

async function fetchQualityGate(component: string) {
  const token = process.env.SONAR_TOKEN
  const org = process.env.SONARCLOUD_ORG
  if (!token || !org) return null

  const url = new URL("https://sonarcloud.io/api/qualitygates/project_status")
  url.searchParams.set("projectKey", component)

  const auth = Buffer.from(`${token}:`).toString("base64")
  const resp = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })
  if (!resp.ok) return null

  return resp.json()
}

export default Plugin.define({
  id: "sonar-watch",
  setup(ctx) {
    const controller = new AbortController()

    void (async () => {
      for await (const event of ctx.event.subscribe({
        types: ["session.idle"],
        signal: controller.signal,
      })) {
        if (event.type !== "session.idle") continue

        try {
          const status = await fetchQualityGate("gd-pms-monorepo")
          if (!status?.projectStatus) continue

          const ps = status.projectStatus
          const gate = ps.status === "OK" ? "PASSED" : `FAILED (${ps.status})`

          try {
            await ctx.app.log({
              body: {
                service: "sonar-watch",
                level: gate === "PASSED" ? "debug" : "warn",
                message: `SonarCloud quality gate: ${gate}`,
              },
            })
          } catch (_) {
            // ponytail: logging is best-effort; silent drop is fine
          }
        } catch (_) {
          // ponytail: quality-gate lookup is best-effort; silent drop is fine
        }
      }
    })()

    return () => controller.abort()
  },
})
