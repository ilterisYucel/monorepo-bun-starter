// OpenCode plugin: surfaces SonarCloud quality-gate status after each session.
// Requires SONAR_TOKEN and SONARCLOUD_ORG environment variables.

async function fetchQualityGate(component) {
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

export const SonarWatch = async ({ client }) => {
  return {
    "session.idle": async () => {
      const component = "gd-pms-monorepo"
      const status = await fetchQualityGate(component)

      if (!status?.projectStatus) return

      const ps = status.projectStatus
      const gate = ps.status === "OK" ? "PASSED" : `FAILED (${ps.status})`

      try {
        await client.app.log({
          body: {
            service: "sonar-watch",
            level: gate === "PASSED" ? "debug" : "warn",
            message: `SonarCloud quality gate: ${gate}`,
          },
        })
      } catch (_) {
        // ponytail: logging is best-effort; silent drop is fine
      }
    },
  }
}
