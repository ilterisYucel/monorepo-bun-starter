/** Boss WireGuard sözleşmesi — backend `/api/admin/wireguard` DTO'ları. */
export interface WireGuardHost {
  id: string;
  name: string;
  endpoint: string;
  publicKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface WireGuardHostInput {
  name: string;
  endpoint: string;
  publicKey: string;
  psk: string;
}

export interface WireGuardHostState {
  id: string;
  state: "up" | "down";
  probedAt?: string;
}
