// ponytail — OpenCode V2 plugin.
//
// Injects the ponytail ruleset into every model request's system prompt at the
// active intensity, and persists /ponytail mode switches. Reuses the shared
// instruction builder so Claude Code, Codex, pi, and OpenCode all read one
// source of truth.
//
// The ruleset and mode resolver live in the vendored ponytail package at
// .opencode/plugins/ponytail/ (nested git clone) — this adapter stays in the
// parent repo so the clone remains pristine.

import { createRequire } from "module"
import fs from "fs"
import os from "os"
import path from "path"
import { Plugin } from "@opencode/plugin"

// The shared instruction builder is CommonJS; bridge to it from this ES module.
const require = createRequire(import.meta.url)
const { getPonytailInstructions } = require("./ponytail/hooks/ponytail-instructions")
const { getDefaultMode, normalizePersistedMode } = require("./ponytail/hooks/ponytail-config")

// OpenCode has no flag-file convention of its own; keep mode beside its config.
const statePath = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
  "opencode",
  ".ponytail-active",
)

function readMode() {
  try {
    return normalizePersistedMode(fs.readFileSync(statePath, "utf8").trim()) || getDefaultMode()
  } catch (e) {
    return getDefaultMode()
  }
}

function writeMode(mode: string) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, mode)
}

export default Plugin.define({
  id: "ponytail",
  async setup(ctx) {
    const log = (level: string, message: string) => {
      try {
        void ctx.app.log({ body: { service: "ponytail", level, message } })
      } catch (e) {
        // ponytail: logging is best-effort; silent drop is fine
      }
    }

    // Append the ruleset to the system prompt on every model request.
    await ctx.session.hook("context", (event) => {
      const mode = readMode()
      if (mode === "off") return
      event.system.push({ type: "text", text: getPonytailInstructions(mode) })
    })

    // Persist `/ponytail <level>` so the next turn's injection follows it.
    // ponytail: mode applies from the next message, not the current one — the
    // hook reads the flag the command writes. Good enough; switch to a
    // synchronous store if same-turn switching ever matters.
    await ctx.command.transform((editor) => {
      editor.add({
        name: "ponytail",
        description: "Switch ponytail intensity level (lite/full/ultra/off)",
        async execute({ sessionID, prompt, delivery }) {
          // `off` is persisted like any mode; the transform reads it and stays silent.
          const mode = normalizePersistedMode((prompt.text || "").trim()) || getDefaultMode()
          writeMode(mode)
          log("info", "ponytail " + mode)
          await ctx.session.prompt({
            ...prompt,
            sessionID,
            text:
              `Switch to ponytail ${mode} mode. If no level specified, use full. ` +
              "Lazy senior dev mode, before any code: does it need to exist at all (YAGNI)? " +
              "Does the standard library do it? A native platform feature? Can it be one line? " +
              "Build the minimum that works. No unrequested abstractions, no avoidable " +
              "dependencies, no boilerplate. Mark intentional simplifications with a " +
              "ponytail: comment.",
            delivery,
          })
        },
      })
    })
  },
})
