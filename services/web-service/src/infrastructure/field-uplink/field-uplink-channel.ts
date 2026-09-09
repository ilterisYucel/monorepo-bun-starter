import type { IHubChannel } from "@gd-monorepo/ws-tunnel";
import type { FieldRegistry } from "./field-registry";

/**
 * FieldUplinkChannel — boss tier `IHubChannel` adapter'i (Faz 3).
 * SessionGateway/TunnelProxy bu sözleşme üzerinden FieldRegistry'ye akar —
 * konteyner modelindeki ContainerProxyFieldChannel'ın birebir karşılığı.
 */
export class FieldUplinkChannel implements IHubChannel {
  constructor(private readonly registry: FieldRegistry) {
    this.registry.addObserver({
      onControlMessage: (fieldId, message) => {
        this.controlSubscribers.forEach((subscriber) => subscriber(fieldId, message));
      },
      onBinaryFrame: (fieldId, data) => {
        this.binarySubscribers.forEach((subscriber) => subscriber(fieldId, data));
      },
    });
  }

  private readonly controlSubscribers: Set<(fieldId: string, message: unknown) => void> =
    new Set();
  private readonly binarySubscribers: Set<(fieldId: string, data: Buffer) => void> =
    new Set();

  sendControl(fieldId: string, message: unknown): void {
    this.registry.sendControl(fieldId, message);
  }

  sendBinary(fieldId: string, data: Buffer): void {
    this.registry.sendBinary(fieldId, data);
  }

  onControlMessage(
    subscriber: (fieldId: string, message: unknown) => void,
  ): () => void {
    this.controlSubscribers.add(subscriber);
    return () => this.controlSubscribers.delete(subscriber);
  }

  onBinaryFrame(subscriber: (fieldId: string, data: Buffer) => void): () => void {
    this.binarySubscribers.add(subscriber);
    return () => this.binarySubscribers.delete(subscriber);
  }

  isConnected(fieldId: string): boolean {
    return this.registry.isConnected(fieldId);
  }
}
