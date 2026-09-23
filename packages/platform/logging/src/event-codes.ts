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
  // WS4: field → konteyner komut proxy audit'i
  "field_container_command",
  // KOMUT-MANEVRA-OPERASYON §8 — operasyon koşusu yaşam döngüsü + kompanzasyon
  "operation_started",
  "operation_completed",
  "operation_failed",
  "operation_rolled_back",
  "operation_state_update_failed",
  "rollback_step_ok",
  "rollback_step_failed",
  "timer_scheduled",
  "timer_schedule_failed",
  // KOMUT-MANEVRA-OPERASYON §7.3 — interlock reddi
  "command_interlock_rejected",
  // KOMUT-MANEVRA-OPERASYON Faz C — uzak manevra kanalı uyarıları
  "maneuver_remote_failed",
  // KOMUT-MANEVRA-OPERASYON Faz C — boss↔field operasyon mesaj audit'i (WS-TUNNEL §8)
  "operation_boss_request",
  "operation_result_sent",
  // KOMUT-MANEVRA-OPERASYON §11.2 — admin tanım yönetimi audit'i
  "operation_definition_created",
  "operation_definition_updated",
  "operation_definition_deleted",
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
  // otomasyon (management-service — kural ateşleme + aksiyon sonuçları;
  // kural bazlı dinamik kodlar `auto_rule_` önekiyle servis validator'ünde)
  "auto_rule_fired",
  "auto_rule_action_ok",
  "auto_rule_action_failed",
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
