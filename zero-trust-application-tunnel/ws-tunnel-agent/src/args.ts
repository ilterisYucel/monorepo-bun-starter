import { basename } from "node:path";

/** Desteklenen alt komutlar. */
export type Command =
  | "run"
  | "setup"
  | "wizard"
  | "uninstall"
  | "config-show"
  | "help";

export interface CliArgs {
  readonly command: Command;
  readonly configPath?: string;
  readonly setupPort?: number;
  readonly name?: string;
  readonly user?: string;
  readonly binary?: string;
}

const COMMANDS = new Set([
  "run",
  "setup",
  "wizard",
  "uninstall",
  "config",
  "help",
]);

/**
 * Argümanları ayrıştırır (sorgu — saf). İlk konumsal alt komuttur; `config
 * show` → `config-show`. Bilinmeyen komut/eksik değer hata fırlatır.
 */
export function parseArgs(argv: readonly string[]): CliArgs {
  let command: Command = "run";
  let name: string | undefined;
  let configPath: string | undefined;
  let setupPort: number | undefined;
  let user: string | undefined;
  let binary: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--help" || arg === "-h") {
      command = "help";
      continue;
    }
    if (!arg.startsWith("--")) {
      if (!COMMANDS.has(arg)) throw new Error(`Bilinmeyen komut: ${arg}`);
      if (arg === "config") {
        const next = argv[index + 1];
        if (next !== "show") throw new Error("Kullanim: config show");
        command = "config-show";
        index += 1;
      } else if (arg === "help") {
        command = "help";
      } else {
        command = arg as Command;
      }
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${arg} icin deger gerekli`);
    }
    index += 1;
    switch (arg) {
      case "--config":
        configPath = value;
        break;
      case "--setup-port": {
        const port = Number(value);
        if (!Number.isInteger(port) || port <= 0 || port > 65535) {
          throw new Error(`--setup-port gecersiz: ${value}`);
        }
        setupPort = port;
        break;
      }
      case "--name":
        name = value;
        break;
      case "--user":
        user = value;
        break;
      case "--binary":
        binary = value;
        break;
      default:
        throw new Error(`Bilinmeyen secenek: ${arg}`);
    }
  }

  return {
    command,
    ...(configPath !== undefined ? { configPath } : {}),
    ...(setupPort !== undefined ? { setupPort } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(user !== undefined ? { user } : {}),
    ...(binary !== undefined ? { binary } : {}),
  };
}

/** Bun ile mi çalışıyoruz (binary kopyalama kararı)? */
export function isBunRuntime(execPath: string): boolean {
  return basename(execPath).startsWith("bun");
}
