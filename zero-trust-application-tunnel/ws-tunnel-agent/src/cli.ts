#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { hostname } from "node:os";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { isBunRuntime, parseArgs } from "./args";
import type { CliArgs } from "./args";
import { mergeConfigEnv, maskConfig, parseAgentConfig } from "./config";
import type { AgentConfig, ConfigEnv } from "./config";
import { BootstrapClaimClient } from "./claim-client";
import { generateSecret } from "./hmac-signer";
import {
  installBinary,
  readAgentConfigFile,
  uninstallAgent,
  writeAgentConfigFile,
  writeUnitFile,
} from "./install";
import { startAgent } from "./run";
import { SetupAgent, shouldStartSetup, startSetupServer } from "./setup-server";
import { renderSystemdUnit } from "./systemd-unit";

const DEFAULT_CONFIG_PATH = "/etc/revpi-agent/agent.env";
const DEFAULT_NAME = "revpi-agent";

function printErrors(errors: readonly string[]): void {
  for (const error of errors) console.error(`[agent] ${error}`);
}

function envForProcess(): ConfigEnv {
  return process.env as ConfigEnv;
}

async function claimAndPersist(
  config: AgentConfig,
  configPath: string,
): Promise<AgentConfig | undefined> {
  const claimClient = new BootstrapClaimClient();
  const claimed = await claimClient.claim(
    config.hubUrl,
    config.peerId,
    config.bootstrapToken!,
  );
  if (claimed.isErr()) {
    printErrors([claimed.error()]);
    return undefined;
  }
  const next: AgentConfig = {
    ...config,
    peerSecret: claimed.unwrap().peerSecret,
    bootstrapToken: undefined,
    hubSecret: config.hubSecret ?? generateSecret(),
  };
  writeAgentConfigFile(configPath, next);
  console.log(`[agent] bootstrap claim tamam — kalici secret yazildi: ${configPath}`);
  return next;
}

function waitForShutdown(): Promise<void> {
  return new Promise((resolve) => {
    const once = () => resolve();
    process.once("SIGINT", once);
    process.once("SIGTERM", once);
  });
}

async function runCommand(args: CliArgs): Promise<number> {
  const configPath = args.configPath ?? process.env.AGENT_CONFIG ?? DEFAULT_CONFIG_PATH;
  const fileEnv = existsSync(configPath) ? readAgentConfigFile(configPath) : {};
  const merged = mergeConfigEnv(fileEnv, envForProcess());

  if (shouldStartSetup({ configExists: existsSync(configPath), env: merged, hostname: hostname() })) {
    return setupCommand(args, configPath);
  }

  const parsed = parseAgentConfig(merged, { hostname: hostname() });
  if (parsed.isErr()) {
    printErrors(parsed.error().map((e) => `${e.field}: ${e.message}`));
    return 2;
  }
  let config: AgentConfig = parsed.unwrap();
  if (config.peerSecret === undefined && config.bootstrapToken !== undefined) {
    const claimed = await claimAndPersist(config, configPath);
    if (claimed === undefined) return 2;
    config = claimed;
  }
  if (config.hubSecret === undefined) {
    config = { ...config, hubSecret: generateSecret() };
  }

  const handle = await startAgent(config, { hubSecret: config.hubSecret! });
  await waitForShutdown();
  await handle.stop();
  return 0;
}

async function setupCommand(args: CliArgs, configPath: string): Promise<number> {
  const port = args.setupPort ?? 8080;
  let resolveSaved: (() => void) | undefined;
  const saved = new Promise<void>((resolve) => {
    resolveSaved = resolve;
  });

  const agent = new SetupAgent({
    hostname: hostname(),
    configPath,
    writeConfig: (config) => writeAgentConfigFile(configPath, config),
    // Yanıt tarayıcıya yazılsın diye setup sunucusunu bir tick sonra kapat.
    onSaved: () => setTimeout(() => resolveSaved?.(), 200),
  });
  const server = startSetupServer({ port, agent });
  console.log(`[agent] setup UI: http://0.0.0.0:${port} (config: ${configPath})`);
  await saved;
  server.stop();
  console.log(`[agent] yapilandirma kaydedildi: ${configPath}`);

  return runCommand({ command: "run", configPath });
}

async function wizardCommand(args: CliArgs): Promise<number> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const name =
      (await rl.question(`Servis adi [${DEFAULT_NAME}]: `)).trim() || DEFAULT_NAME;
    const hubUrl = (
      await rl.question("Hub URL [http://192.168.1.100:5003]: ")
    ).trim();
    const authMode = (
      await rl.question("Kimlik modu (token/bootstrap) [token]: ")
    ).trim() || "token";
    if (authMode !== "token" && authMode !== "bootstrap") {
      printErrors(["Kimlik modu token veya bootstrap olmali"]);
      return 2;
    }
    const token = (await rl.question("Token: ")).trim();
    const peerId = (await rl.question(`Peer ID [${hostname()}]: `)).trim() || hostname();
    const serviceId = (await rl.question("Service ID: ")).trim();
    const localTarget = (await rl.question("Yerel hedef (LOCAL_TARGET): ")).trim();
    const tlsInsecure =
      localTarget.startsWith("https://") &&
      /^e/i.test((await rl.question("Self-signed TLS kabul edilsin mi? [e/H]: ")).trim());
    const user =
      (await rl.question(`Servis kullanicisi [${args.user ?? "pi"}]: `)).trim() ||
      args.user ||
      "pi";

    const parsed = parseAgentConfig(
      {
        HUB_URL: hubUrl,
        PEER_ID: peerId,
        SERVICE_ID: serviceId,
        LOCAL_TARGET: localTarget,
        PEER_TOKEN: authMode === "token" ? token : undefined,
        BOOTSTRAP_TOKEN: authMode === "bootstrap" ? token : undefined,
        TLS_INSECURE: tlsInsecure ? "1" : "0",
      },
      { hostname: hostname() },
    );
    if (parsed.isErr()) {
      printErrors(parsed.error().map((e) => `${e.field}: ${e.message}`));
      return 2;
    }

    const configPath = `/etc/${name}/agent.env`;
    let config: AgentConfig = { ...parsed.unwrap(), hubSecret: generateSecret() };
    if (config.bootstrapToken !== undefined && config.peerSecret === undefined) {
      const claimed = await claimAndPersist(config, configPath);
      if (claimed === undefined) return 2;
      config = claimed;
    }

    const binarySource =
      args.binary ?? (isBunRuntime(process.execPath) ? undefined : process.execPath);
    if (binarySource === undefined || !existsSync(binarySource)) {
      printErrors(["--binary <derlenmis-agent> gerekli (bun ile calisiyorsun)"]);
      return 2;
    }
    const binaryPath = `/opt/${name}/agent`;
    installBinary(binarySource, binaryPath);
    writeAgentConfigFile(configPath, config);

    const unitPath = `/etc/systemd/system/${name}.service`;
    writeUnitFile(
      unitPath,
      renderSystemdUnit({ name, binaryPath, configPath, user }),
    );
    spawnSync("systemctl", ["daemon-reload"], { stdio: "inherit" });
    spawnSync("systemctl", ["enable", "--now", `${name}.service`], {
      stdio: "inherit",
    });
    console.log(`[agent] kuruldu: ${unitPath} (servis: ${name}.service)`);
    return 0;
  } finally {
    rl.close();
  }
}

function configShowCommand(args: CliArgs): number {
  const configPath = args.configPath ?? process.env.AGENT_CONFIG ?? DEFAULT_CONFIG_PATH;
  const env = existsSync(configPath)
    ? mergeConfigEnv(readAgentConfigFile(configPath), {})
    : envForProcess();
  const parsed = parseAgentConfig(env, { hostname: hostname() });
  if (parsed.isErr()) {
    printErrors(parsed.error().map((e) => `${e.field}: ${e.message}`));
    return 2;
  }
  process.stdout.write(maskConfig(parsed.unwrap()));
  return 0;
}

function uninstallCommand(args: CliArgs): number {
  const name = args.name ?? DEFAULT_NAME;
  const result = uninstallAgent({
    name,
    unitPath: `/etc/systemd/system/${name}.service`,
    configPath: `/etc/${name}/agent.env`,
    runCommand: (command, commandArgs) =>
      spawnSync(command, commandArgs, { stdio: "inherit" }).status ?? 1,
  });
  console.log(`[agent] kaldirildi (${name}): ${result.removed.join(", ") || "dosya yok"}`);
  return 0;
}

function help(): number {
  console.log(`ws-tunnel agent

Kullanim:
  agent [run] [--config <env-file>]       # calistir (config yoksa setup UI)
  agent setup [--setup-port <port>]       # setup UI'yi zorla
  agent wizard [--name <ad>] [--user <u>] [--binary <path>]
  agent uninstall [--name <ad>]
  agent config show [--config <env-file>]
`);
  return 0;
}

/** CLI giriş noktası — sonuç kodu döner (process.exit çağırmaz). */
export async function main(argv: readonly string[]): Promise<number> {
  try {
    const args = parseArgs(argv);
    switch (args.command) {
      case "help":
        return help();
      case "run":
        return runCommand(args);
      case "setup":
        return setupCommand(args, args.configPath ?? process.env.AGENT_CONFIG ?? DEFAULT_CONFIG_PATH);
      case "wizard":
        return wizardCommand(args);
      case "uninstall":
        return uninstallCommand(args);
      case "config-show":
        return configShowCommand(args);
    }
  } catch (error) {
    printErrors([(error as Error).message]);
    return 2;
  }
}

const meta = import.meta as { main?: boolean };
if (meta.main === true) {
  void main(process.argv.slice(2)).then((code) => process.exit(code));
}
