/** systemd unit üretimi için girdi. */
export interface SystemdUnitConfig {
  readonly name: string;
  readonly binaryPath: string;
  readonly configPath: string;
  readonly user?: string;
}

/**
 * systemd unit içeriğini üretir (sorgu — saf). Servis, agent binary'sini
 * `run --config` ile çalıştırır; `network-online` sonrası başlar ve her
 * çıkışta yeniden başlatılır.
 */
export function renderSystemdUnit(config: SystemdUnitConfig): string {
  const lines = [
    "[Unit]",
    `Description=${config.name} ws-tunnel agent`,
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=simple",
    `ExecStart=${config.binaryPath} run --config ${config.configPath}`,
    "Restart=always",
    "RestartSec=5",
  ];
  if (config.user !== undefined && config.user.trim().length > 0) {
    lines.push(`User=${config.user}`);
  }
  lines.push(
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    "",
  );
  return lines.join("\n");
}
