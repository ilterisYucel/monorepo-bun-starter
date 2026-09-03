import type { IFieldChannel } from "@gd-monorepo/ws-tunnel";
import type { ContainerProxy } from "./container-proxy";

/**
 * ContainerProxyFieldChannel — ws-tunnel `IFieldChannel` sözleşmesinin
 * ContainerProxy adapter'i (field tier): sendControl/sendBinary birebir delege
 * edilir; onControlMessage/onBinaryFrame observer üzerinden yayınlanır;
 * isConnected → `connectionStatus()` === "connected".
 */
export class ContainerProxyFieldChannel implements IFieldChannel {
  constructor(private readonly proxy: ContainerProxy) {}

  sendControl(containerId: string, message: unknown): void {
    this.proxy.sendControl(containerId, message);
  }

  sendBinary(containerId: string, data: Buffer): void {
    this.proxy.sendBinary(containerId, data);
  }

  onControlMessage(
    subscriber: (containerId: string, message: unknown) => void,
  ): () => void {
    const observer = {
      onData: () => {},
      onConnectionChange: () => {},
      onControlMessage: (containerId: string, message: unknown) =>
        subscriber(containerId, message),
    };
    this.proxy.addObserver(observer);
    return () => this.proxy.removeObserver(observer);
  }

  onBinaryFrame(
    subscriber: (containerId: string, data: Buffer) => void,
  ): () => void {
    const observer = {
      onData: () => {},
      onConnectionChange: () => {},
      onBinaryFrame: (containerId: string, data: Buffer) =>
        subscriber(containerId, data),
    };
    this.proxy.addObserver(observer);
    return () => this.proxy.removeObserver(observer);
  }

  isConnected(containerId: string): boolean {
    return this.proxy.connectionStatus().get(containerId) === "connected";
  }
}
