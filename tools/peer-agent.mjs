#!/usr/bin/env bun
/**
 * peer-agent.mjs — ince wrapper (geriye dönük).
 *
 * Asıl agent `packages/ws-tunnel-agent` modülüdür; bu script yalnız env ile
 * çalıştırır (revpi-agent-check ve eski kullanım uyumu). Üretim kurulumu:
 *   agent run --config /etc/<ad>/agent.env   (ya da wizard/setup)
 *
 * Env: HUB_URL, PEER_ID, SERVICE_ID, LOCAL_TARGET, PEER_TOKEN (veya
 *      BOOTSTRAP_TOKEN), PEER_TYPE?, TLS_INSECURE?
 */

import { hostname } from "node:os";
import { parseAgentConfig } from "../packages/ws-tunnel-agent/src/config.ts";
import { generateSecret } from "../packages/ws-tunnel-agent/src/hmac-signer.ts";
import { startAgent } from "../packages/ws-tunnel-agent/src/run.ts";

const parsed = parseAgentConfig(process.env, { hostname: hostname() });
if (parsed.isErr()) {
  for (const error of parsed.error()) {
    console.error(`[peer-agent] ${error.field}: ${error.message}`);
  }
  process.exit(1);
}

let config = parsed.unwrap();
if (config.hubSecret === undefined) {
  config = { ...config, hubSecret: generateSecret() };
}

const handle = await startAgent(config, { hubSecret: config.hubSecret });

const shutdown = async () => {
  await handle.stop();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
