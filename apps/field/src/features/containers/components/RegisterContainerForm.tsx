import React, { useState } from "react";
import { COLORS, useTranslation } from "@gd-monorepo/ui";
import { containersApi } from "../services/containersApi";

/**
 * RegisterContainerForm — konteyner kayıt formu (2026-08-28; 2026-08-30 modal).
 *
 * Kurulum adımı: operatör konteynerin CONTAINER_TOKEN'ini burada field'a
 * kaydeder — field yalnızca SHA-256 hash'i saklar (düz metin DB'ye yazılmaz).
 * Uç admin/boss yetkisi ister; UI yalnızca bu roller için render edilir
 * (ContainersPage — savunma katmanı, enforcement sunucuda).
 *
 * 2026-08-30: "Konteyner Adresi" alanı KALDIRILDI — field konteynere URL ile
 * bağlanmaz (outbound WSS mimarisi; bkz. AGENTS.md FieldConnector sözleşmesi).
 * Form artık ContainersPage'teki MODAL içinde açılır (dış kart görünümü yok).
 *
 * Aynı (fieldId, containerId) yeniden gönderilirse kayıt GÜNCELLENİR
 * (UPSERT) — "kayıt" ve "güncelle" tek formdur.
 */
export const RegisterContainerForm: React.FC<{
  fieldId: string;
  onRegistered: () => void;
}> = ({ fieldId, onRegistered }) => {
  const { t } = useTranslation();
  const [containerId, setContainerId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const inputStyle: React.CSSProperties = {
    background: COLORS.bgInput,
    border: `1px solid ${COLORS.borderDefault}`,
    borderRadius: "6px",
    color: COLORS.textPrimary,
    padding: "8px 10px",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    color: COLORS.textMuted,
    marginBottom: "4px",
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setSuccess(undefined);

    if (containerId.trim().length === 0) {
      setError(t("container.register.invalidId"));
      return;
    }
    if (token.length < 32) {
      setError(t("container.register.invalidToken"));
      return;
    }

    setSubmitting(true);
    try {
      await containersApi.register(fieldId, {
        containerId: containerId.trim(),
        token,
      });
      setSuccess(t("container.register.success"));
      setContainerId("");
      setToken("");
      onRegistered();
    } catch {
      setError(t("container.register.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div>
        <label htmlFor="register-container-id" style={labelStyle}>
          {t("container.register.containerId")}
        </label>
        <input
          id="register-container-id"
          value={containerId}
          onChange={(e) => setContainerId(e.target.value)}
          placeholder="container-1"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="register-token" style={labelStyle}>
          {t("container.register.token")}
        </label>
        <input
          id="register-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="openssl rand -hex 32"
          style={inputStyle}
        />
        <span style={{ fontSize: "11px", color: COLORS.textMuted }}>
          {t("container.register.tokenHint")}
        </span>
      </div>

      {error && (
        <span style={{ fontSize: "12px", color: COLORS.error }}>{error}</span>
      )}
      {success && (
        <span style={{ fontSize: "12px", color: COLORS.success }}>{success}</span>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          alignSelf: "flex-end",
          background: COLORS.infoDark,
          border: "none",
          borderRadius: "6px",
          color: COLORS.textWhite,
          padding: "8px 16px",
          fontSize: "13px",
          cursor: submitting ? "default" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {t("container.register.submit")}
      </button>
    </form>
  );
};
