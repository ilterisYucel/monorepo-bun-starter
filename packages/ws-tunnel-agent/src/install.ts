import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { readEnvFile, serializeAgentConfig } from "./config";
import type { AgentConfig, ConfigEnv } from "./config";

/** Config env-file'ını 0600 ile yazar (komut). */
export function writeAgentConfigFile(path: string, config: AgentConfig): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, serializeAgentConfig(config), { mode: 0o600 });
  chmodSync(path, 0o600);
}

/** Config env-file'ını okur; dosya yoksa hata fırlatır. */
export function readAgentConfigFile(path: string): ConfigEnv {
  return readEnvFile(readFileSync(path, "utf8"));
}

/** systemd unit dosyasını 0644 ile yazar (komut). */
export function writeUnitFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { mode: 0o644 });
  chmodSync(path, 0o644);
}

/** Binary'yi hedefe kopyalar ve çalıştırılabilir yapar (komut). */
export function installBinary(source: string, destination: string): void {
  mkdirSync(dirname(destination), { recursive: true });
  if (source !== destination) copyFileSync(source, destination);
  chmodSync(destination, 0o755);
}

/** Var olan kurulum dosyalarını siler; silinenleri döner (komut). */
export function removeInstallFiles(paths: readonly string[]): string[] {
  const removed: string[] = [];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    rmSync(path, { force: true });
    removed.push(path);
  }
  return removed;
}

export type CommandRunner = (command: string, args: string[]) => number;

export interface UninstallOptions {
  readonly name: string;
  readonly unitPath: string;
  readonly configPath: string;
  readonly runCommand: CommandRunner;
}

/**
 * Servisi durdurur, disable eder, unit/config dosyalarını siler. systemctl
 * hataları yutulur (dosya temizliği her durumda yapılır).
 */
export function uninstallAgent(options: UninstallOptions): {
  ok: boolean;
  removed: string[];
} {
  const service = `${options.name}.service`;
  options.runCommand("systemctl", ["stop", service]);
  options.runCommand("systemctl", ["disable", service]);
  const removed = removeInstallFiles([options.unitPath, options.configPath]);
  options.runCommand("systemctl", ["daemon-reload"]);
  return { ok: true, removed };
}
