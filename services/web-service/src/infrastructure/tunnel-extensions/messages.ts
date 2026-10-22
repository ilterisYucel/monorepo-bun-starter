import { z } from "zod";

/**
 * Tünel ÜSTÜ domain mesajları — GD-PMS telemetri/operasyon/olay sözleşmeleri.
 *
 * Bu tipler bilinçli olarak `@gd-monorepo/ws-tunnel` PAKETİNDE DEĞİLDİR: paket
 * yalnız transport taşır; domain mesajları tüketicide (bu modülde) yaşar ve
 * paketin jenerik kontrol kanalından geçer. **Wire JSON şekilleri değişmez** —
 * mevcut peer'lar aynı frame'leri gönderir/alır.
 */

/** Kanaldan taşınan en küçük telemetri noktası. */
export interface TunnelTelemetryPoint {
  deviceId: string;
  name: string;
  value: number | boolean | string;
  timestamp: string;
  unit?: string;
  description?: string;
  tags?: Record<string, string>;
}

/** Snapshot push kaynağı — en güncel değerleri döndürür (boş olabilir). */
export interface ISnapshotSource {
  snapshot(): Promise<TunnelTelemetryPoint[]>;
}

/** Client→Hub: En güncel telemetri snapshot'ı. */
export interface TelemetryMessage {
  type: "telemetry";
  data: TunnelTelemetryPoint[];
}

/** Hub→Client: tarihsel (downsampled) telemetri serisi sorgusu. */
export interface TelemetryQueryMessage {
  type: "telemetry-query";
  queryId: string;
  from: string;
  to: string;
  points: number;
  deviceIds?: string[];
  names?: string[];
  tag?: string;
  mode?: "downsampled" | "latest";
}

/** Client→Hub: `telemetry-query` yanıtı — downsampled seri (boş olabilir). */
export interface TelemetryResultMessage {
  type: "telemetry-result";
  queryId: string;
  data: TunnelTelemetryPoint[];
}

/** Client→Hub: sorgu başarısız — hub boş seri gösterir (kademeli bozulma). */
export interface TelemetryQueryErrorMessage {
  type: "telemetry-query-error";
  queryId: string;
  message: string;
}

/** Telemetri sorgu mesajları — tünel kontrol kanalından taşınır. */
export type TelemetryQueryControlMessage =
  | TelemetryQueryMessage
  | TelemetryResultMessage
  | TelemetryQueryErrorMessage;

/** `telemetry-query` alım zod şeması — güvenilmez hub girdisi doğrulanır. */
export const telemetryQuerySchema = z.object({
  queryId: z.string().min(1).max(128),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  points: z.number().int().min(1).max(5000),
  deviceIds: z.array(z.string().min(1)).max(200).optional(),
  names: z.array(z.string().min(1)).max(500).optional(),
  tag: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).max(64).optional(),
  mode: z.enum(["downsampled", "latest"]).optional(),
});

/** Hub→peer: operasyon tetikleme isteği. */
export interface OperationExecuteMessage {
  type: "operation-execute";
  operationId: string;
  name: string;
  params?: Record<string, unknown>;
  traceId?: string;
}

/** Peer→Hub: operasyon sonucu — her zaman gönderilir. */
export interface OperationResultMessage {
  type: "operation-result";
  operationId: string;
  status: "completed" | "failed" | "rolled_back" | "rejected";
  reason?: string;
  results?: OperationStepResult[];
}

/** Operasyon adımı sonucu — makine-okunur özet. */
export interface OperationStepResult {
  step: number;
  system?: string;
  maneuver?: string;
  ok: boolean;
  reason?: string;
}

/** Operasyon kontrol mesajları. */
export type OperationControlMessage =
  | OperationExecuteMessage
  | OperationResultMessage;

/** `operation-execute` alım zod şeması — STRICT (güven sınırı). */
export const operationExecuteSchema = z
  .object({
    type: z.literal("operation-execute"),
    operationId: z.string().min(1).max(128),
    name: z.string().min(1).max(128),
    params: z.record(z.unknown()).optional(),
    traceId: z.string().min(1).max(256).optional(),
  })
  .strict();

/** Peer→Hub: jenerik olay bildirimi (alarm/audit aktarımı). */
export interface EventMessage {
  type: "event";
  eventId: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "app" | "security";
  eventCode: string;
  message: string;
  context?: Record<string, string>;
}
