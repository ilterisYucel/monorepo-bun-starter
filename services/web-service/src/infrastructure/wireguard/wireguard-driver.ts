import { execFile } from "node:child_process";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";

/** WG peer yapılandırması — boss istemcisi olarak host'a bağlanır. */
export interface WireGuardPeerConfig {
  name: string;
  clientAddress: string;
  clientPrivateKey: string;
  endpoint: string;
  peerPublicKey: string;
  psk: string;
  allowedIps: string;
}

export type WireGuardState = "up" | "down";

/**
 * IWireGuardDriver — wg-quick sarmalayıcı sözleşmesi (Strategy).
 * Üretim: `WgQuickDriver`; testlerde fake driver enjekte edilir.
 */
export interface IWireGuardDriver {
  up(config: WireGuardPeerConfig): Promise<void>;
  down(name: string): Promise<void>;
  status(name: string): Promise<WireGuardState>;
}

/** WgQuickDriver yapılandırması. */
export interface WgQuickDriverConfig {
  /** .conf dosyalarının yazılacağı dizin (varsayılan /etc/wireguard). */
  configDir: string;
}

const exec = (command: string, args: string[]): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    execFile(command, args, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const renderConf = (config: WireGuardPeerConfig): string => `[Interface]
Address = ${config.clientAddress}
PrivateKey = ${config.clientPrivateKey}

[Peer]
PublicKey = ${config.peerPublicKey}
PresharedKey = ${config.psk}
Endpoint = ${config.endpoint}
AllowedIPs = ${config.allowedIps}
`;

/**
 * WgQuickDriver — gerçek `wg-quick` sürücüsü. `up` için `.conf` yazar,
 * `wg-quick up <name>` çalıştırır; `down`/`status` benzer şekilde.
 * PSK yalnızca .conf dosyasına yazılır — loglara ASLA girmez.
 */
export class WgQuickDriver implements IWireGuardDriver {
  private readonly configDir: string;

  constructor(config: WgQuickDriverConfig) {
    this.configDir = config.configDir;
  }

  async up(config: WireGuardPeerConfig): Promise<void> {
    const file = this.confPath(config.name);
    await writeFile(file, renderConf(config), { mode: 0o600 });
    try {
      await exec("wg-quick", ["up", file]);
    } catch (error) {
      await rm(file, { force: true });
      throw error;
    }
  }

  async down(name: string): Promise<void> {
    const file = this.confPath(name);
    try {
      await exec("wg-quick", ["down", file]);
    } catch {
      // zaten kapalı — idempotent down
    }
    await rm(file, { force: true });
  }

  async status(name: string): Promise<WireGuardState> {
    try {
      await exec("wg", ["show", name]);
      return "up";
    } catch {
      return "down";
    }
  }

  private confPath(name: string): string {
    return path.join(this.configDir, `${name}.conf`);
  }
}
