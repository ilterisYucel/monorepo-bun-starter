import { describe, it, expect, vi } from "vitest";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { ManagementJob } from "@gd-monorepo/shared-types";
import { ContainerConnectionTelemetryPublisher } from "./container-connection-telemetry-publisher";

/**
 * ContainerConnectionTelemetryPublisher sözleşmesi
 * (FIELD-MANEVRA-KATALOGU-REV01-MIMARISI.md §5 seçenek-a):
 *
 * - ContainerProxy `onConnectionChange` → synthetic MANAGEMENT job yayını
 *   (deviceId="field", telemetry `Container <id> Connection`, value 0/1/2).
 * - Eşleme: idle→0, connected→1, stale→2, error→0.
 * - Yayın best-effort: addJob reddi yutulur (warn), observer akışı bozulmaz.
 * - onData/onControlMessage/onBinaryFrame no-op (yalnızca durum kaynağı).
 */

function makeQueue(): IMessageQueue & { jobs: unknown[] } {
  const jobs: unknown[] = [];
  return {
    jobs,
    addJob: vi.fn(async (job: unknown) => {
      jobs.push(job);
    }),
  } as unknown as IMessageQueue & { jobs: unknown[] };
}

describe("ContainerConnectionTelemetryPublisher", () => {
  it("connected → value 1 MANAGEMENT job'ı (deviceId=field)", async () => {
    const mq = makeQueue();
    const publisher = new ContainerConnectionTelemetryPublisher(mq);

    publisher.onConnectionChange("c-1", "connected");
    await Promise.resolve();

    const job = mq.jobs[0] as ManagementJob;
    expect(job.type).toBe("MANAGEMENT");
    expect(job.deviceId).toBe("field");
    expect(job.telemetries).toHaveLength(1);
    expect(job.telemetries[0]).toMatchObject({
      name: "Container c-1 Connection",
      value: 1,
      deviceId: "field",
    });
  });

  it("durum eşlemesi: idle→0, stale→2, error→0", async () => {
    const mq = makeQueue();
    const publisher = new ContainerConnectionTelemetryPublisher(mq);

    publisher.onConnectionChange("c-1", "idle");
    publisher.onConnectionChange("c-1", "stale");
    publisher.onConnectionChange("c-1", "error");
    await Promise.resolve();

    const values = mq.jobs.map(
      (j) => (j as ManagementJob).telemetries[0]!.value,
    );
    expect(values).toEqual([0, 2, 0]);
  });

  it("addJob reddi yutulur — throw YOK (best-effort)", async () => {
    const failing = {
      addJob: vi.fn(async () => {
        throw new Error("kuyruk kapali");
      }),
    } as unknown as IMessageQueue;
    const publisher = new ContainerConnectionTelemetryPublisher(failing);

    expect(() => publisher.onConnectionChange("c-1", "connected")).not.toThrow();
    await Promise.resolve();
    expect(failing.addJob).toHaveBeenCalledTimes(1);
  });

  it("diğer observer callback'leri no-op", () => {
    const mq = makeQueue();
    const publisher = new ContainerConnectionTelemetryPublisher(mq);

    publisher.onData("c-1", []);
    publisher.onControlMessage?.("c-1", { type: "x" });
    publisher.onBinaryFrame?.("c-1", Buffer.from([0]));
    expect(mq.jobs).toHaveLength(0);
  });
});
