// Konteyner oturum modülü (field tier) — web-service'te kalanlar.
// HubSessionStore/SessionGateway/TunnelProxy 2026-09-01'de
// @gd-monorepo/ws-tunnel'a taşındı (KUTUPHANE-CIKARMA-PLANI.md);
// SessionAudit (PG + TamperLogger) IAuditSink implementasyonu olarak kaldı.

export { SessionAudit, SESSION_AUDIT_DDL } from "./session-audit";
