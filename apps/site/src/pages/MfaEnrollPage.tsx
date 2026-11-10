import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { postLoginDestination, siteFieldId } from "../lib/site-field";
import { COLORS, useTranslation } from "@gd-monorepo/ui";

/**
 * MfaEnrollPage — Faz 6 T6.1: TOTP kayıt akışı.
 *
 * Adımlar: (1) kayıt başlat → sır + otpauth URI gösterilir (authenticator
 * uygulamasına manuel giriş); (2) 6 haneli kod doğrulaması → MFA aktifleşir,
 * tek kullanımlık kurtarma kodları GÖSTERİLİR (bir daha gösterilmez);
 * (3) Devam → saha sayfası.
 */
export const MfaEnrollPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, mfaEnroll, mfaConfirm, mfaRequiredRoles } = useAuthStore();
  const [secret, setSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setBusy(true);
    mfaEnroll()
      .then((data) => {
        if (cancelled) return;
        setSecret(data.secret);
        setOtpauthUri(data.otpauthUri);
      })
      .catch(() => {
        if (!cancelled) setError(t("auth.mfaEnrollError"));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, mfaEnroll, t]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const codes = await mfaConfirm(code);
      setRecoveryCodes(codes);
    } catch {
      setError(t("auth.mfaWrongCode"));
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = () => {
    // 2026-08-28: kayıt tamamlandı (mfaEnabled=true) — saha listesi çözümü
    // yok; doğrudan tek sahanın ana sayfasına gidilir.
    const destination = postLoginDestination(user, mfaRequiredRoles, siteFieldId());
    if ("error" in destination) {
      setError(destination.error);
      return;
    }
    navigate(destination.path, { replace: true });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: COLORS.bgApp,
      }}
    >
      <div
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: "14px",
          padding: "40px",
          width: "420px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h2 style={{ color: COLORS.textWhite, textAlign: "center", marginBottom: "8px" }}>
          {recoveryCodes.length > 0
            ? t("auth.mfaRecoveryTitle")
            : t("auth.mfaEnrollTitle")}
        </h2>

        {error && (
          <div style={{ color: COLORS.error, fontSize: "13px", textAlign: "center" }}>
            {error}
          </div>
        )}

        {recoveryCodes.length > 0 ? (
          <>
            <p style={{ color: COLORS.textMuted, fontSize: "13px", textAlign: "center" }}>
              {t("auth.mfaRecoveryHint")}
            </p>
            <div
              style={{
                background: COLORS.bgCodeDark,
                border: `1px solid ${COLORS.borderDefault}`,
                borderRadius: "8px",
                padding: "14px",
                fontFamily: "monospace",
                fontSize: "14px",
                color: COLORS.textWhite,
                lineHeight: "1.9",
              }}
            >
              {recoveryCodes.map((code) => (
                <div key={code}>{code}</div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleContinue()}
              style={{
                padding: "10px",
                background: COLORS.info,
                border: "none",
                borderRadius: "8px",
                color: COLORS.textWhite,
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {t("auth.mfaContinue")}
            </button>
          </>
        ) : (
          <form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                background: COLORS.bgCodeDark,
                border: `1px solid ${COLORS.borderDefault}`,
                borderRadius: "8px",
                padding: "12px",
                fontFamily: "monospace",
                fontSize: "13px",
                color: COLORS.textWhite,
                wordBreak: "break-all",
                lineHeight: "1.7",
              }}
            >
              <div style={{ color: COLORS.textMuted, fontSize: "11px" }}>
                {t("auth.mfaManualSecret")}
              </div>
              {secret}
              <div style={{ color: COLORS.textMuted, fontSize: "11px", marginTop: "8px" }}>
                otpauth URI
              </div>
              {otpauthUri}
            </div>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("auth.mfaCodePlaceholder")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                padding: "10px 12px",
                background: COLORS.bgInput,
                border: `1px solid ${COLORS.borderDefault}`,
                borderRadius: "8px",
                color: COLORS.textPrimary,
                fontSize: "14px",
                outline: "none",
                textAlign: "center",
                letterSpacing: "4px",
              }}
            />

            <button
              type="submit"
              disabled={busy}
              style={{
                padding: "10px",
                background: COLORS.info,
                border: "none",
                borderRadius: "8px",
                color: COLORS.textWhite,
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {t("auth.mfaVerify")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
