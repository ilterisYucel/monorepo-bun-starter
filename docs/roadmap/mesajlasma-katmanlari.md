# Mesajlaşma Katmanları Planı

> **Karar tarihi:** 2026-08-31 · **Bağlam:** `docs/roadmap/platform-paket-yapisi.md` Aşama 0.

## Sorun

`BullMQAdapter` hem jenerik BullMQ sarmalayıcı hem de GD-PMS'ye özgü işler (6 JobType, kuyruk adları, retry politikaları) içeriyordu. Adapter proje-bağımsız olmalı; sistem kuyrukları onun ÜSTÜNE kurulmalı.

## İki katmanlı çözüm

### Katman 1 — Generic adapter (core, proje-bağımsız)

```ts
// packages/core/src/messaging/bullmq-adapter.ts — JobType/DeviceJob BİLMEZ
class BullMQAdapter {
  openQueue(name: string, opts?: { retryOptions?: JobsOptions }): Promise<BullMQQueue>; // factory, lazy + önbellekli
  queueStatus(): Promise<QueueStatus[]>;   // açık TÜM kuyruklar (name = kuyruk adı)
  health(): Promise<boolean>;              // yalnızca redis ping
  close(): Promise<void>;
}

// packages/core/src/messaging/bullmq-queue.ts — tek kuyruk facade'ı
class BullMQQueue {
  add(jobName: string, data: unknown, opts?: { delay?: number; jobId?: string }): Promise<void>;
  addRepeatable(jobName, data, everyMs, opts?: { jobId?: string; startDate?: Date }): Promise<void>;
  addRepeatablePattern(jobName, data, pattern, opts?: { jobId?: string }): Promise<void>;
  executeAndWait(jobName, data, timeoutMs, opts?: { jobId?: string; priority?: number }): Promise<QueueResult>;
  registerWorker(processor: (job: unknown) => Promise<unknown>, options?: QueueWorkerOptions): Promise<void>;
  stats(): Promise<QueueStatus>;
  jobCounts(): Promise<Record<string, number> | undefined>;
  close(): Promise<void>;
}
```

BullMQ'nun tüm işlemleri bu iki sınıfta sabitlenir — bullmq API değişirse yalnızca bu dosyalar değişir. `IMessageQueue` sözleşmesine karışmaz.

### Katman 2 — Sistem kuyrukları (`packages/platform/messaging`)

```ts
// PlatformMessageQueue — JobType'ı bilen TEK yer; IMessageQueue'yu implement eder
class PlatformMessageQueue implements IMessageQueue {
  constructor(connection: RedisConnection, config?: PlatformMessageQueueConfig);
  addJob(job: DeviceJob, opts?)                       // → openQueue(queueNames[job.type]).add(...)
  executeAndWait(...) / addRepeatableJob(...) / addRepeatableJobEvery(...)
  registerWorker(...) / registerWorkerFor(...)
  queueStatus() / queueStats() / health() / close()  // mevcut karakterize davranış korunur
}
```

- `QUEUE_NAMES` + `JOB_RETRY_OPTIONS` bu pakette yaşar (adapter'dan tamamen çıktı).
- `queueStatus()`/`queueStats()`'ta `name` alanı **JobType** kalır (mevcut sözleşme).
- `health()`: redis ping + READ_DEVICE kuyruğu açıksa jobCounts denetimi (mevcut davranış).
- Ürün özelinde ekstra kuyruk isteyen servis, ayrıca generic `BullMQAdapter` kullanabilir.

## Kararlar

- `IMessageQueue` sözleşmesi DEĞİŞMEDİ → servisler sıfır değişiklikle çalışır; yalnızca bootstrap import'u değişir.
- CQS isimlendirme: `queueStatus()`/`queueStats()` (eski `getQueueStatus`/`getQueueStats`).
- Config override: `queueNames`/`retryOptions` JobType başına; bilinmeyen anahtar yok sayılır; retryOptions tip başına TAM değiştirme yapar.
