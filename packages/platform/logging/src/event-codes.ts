// packages/platform/logging/src/event-codes.ts

/**
 * GD-PMS olay sözlüğü — TamperLogger'ın bilmediği, platforma özgü eventCode
 * kümesi. Generic `@gd-monorepo/tamper-logger` eventCode'u serbest string
 * kabul eder; servis bootstrap'ları bu doğrulayıcıyı
 * `TamperLoggerConfig.eventCodeValidator` olarak ENJEKTE eder (fail-closed).
 *
 * Yeni kod eklemek için yalnızca bu diziye satır eklenir (kod değişikliği yok).
 */
export const LOG_EVENT_CODES = [
  // kimlik doğrulama
  "login_failed",
  "login_succeeded",
  "token_verification_failed",
  "rate_limit_exceeded",
  // Faz 6 T6.1 — MFA
  "mfa_login_failed",
  "mfa_enrolled",
  "mfa_reset",
  "mfa_recovery_used",
  // Faz 6 T6.6 — hesap kilidi
  "login_locked",
  // oturum / tünel
  "session_open",
  "session_end",
  "session_anomaly",
  // komut
  "command_executed",
  "command_rejected",
  // ws / field bağlantısı
  "ws_register_rejected",
  "ws_connection_lost",
  "field_connected",
  "field_disconnected",
  "field_config_rejected",
  "telemetry_push_failed",
  "telemetry_query_failed",
  // modbus / cihaz
  "modbus_read_failed",
  "modbus_write_failed",
  "device_offline",
  "device_online",
  // cihaz alarmları (geçiş-odaklı — yalnızca yükselen/düşen kenarda)
  "device_alarm",
  "device_alarm_cleared",
  "alarm_resolved",
  // telemetri
  "telemetry_write_failed",
  // istek sınırı (web-service setErrorHandler)
  "request_rejected",
  "request_failed",
  // istemci olayları (ClientLogger → POST /api/logs)
  "client_event",
  // log altyapısının kendisi
  "tamper_detected",
  "audit_sink_failure",
  "log_drop",
  // yaşam döngüsü
  "service_started",
  "service_stopped",
  "config_loaded",
  "health_degraded",
] as const;

export type LogEventCode = (typeof LOG_EVENT_CODES)[number];

/** Çalışma zamanı doğrulaması: verilen string kayıtlı bir eventCode mu? */
export function isLogEventCode(value: string): value is LogEventCode {
  return (LOG_EVENT_CODES as readonly string[]).includes(value);
}
