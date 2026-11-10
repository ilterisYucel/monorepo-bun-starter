import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { fieldRootPath } from "../lib/api-base";
import { siteFieldId } from "../lib/site-field";
import { COLORS, useTranslation } from "@gd-monorepo/ui";

/**
 * ChangePasswordPage — Faz 1 T1.6: ilk girişte zorunlu şifre değişimi.
 * Backend rbac'i bayrak true iken diğer tüm yolları 403 ile kapatır;
 * bu sayfa değişim tamamlanana kadar tek çıkıştır.
 */
export const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { changePassword, user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError(t("auth.newPasswordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    try {
      await changePassword(oldPassword, newPassword);
      if (user?.role === "boss") {
        // LoginPage sözleşmesiyle aynı (postLoginDestination: boss → /map) —
        // SPA navigasyonu; eski window.location.href tam sayfa reload'uydu.
        navigate("/map", { replace: true });
        return;
      }
      // Tek saha kimliği — build'de gömülü VITE_FIELD_ID (site-field.ts
      // sözleşmesi). user.fieldIds sahte "default-field" fallback'i 2026-09-14'te
      // kaldırıldı: geçersiz UUID, sonrasındaki TÜM istekleri 500'e düşürüyordu.
      const fieldId = siteFieldId();
      if (fieldId.length === 0) {
        setError(t("auth.changePasswordError"));
        return;
      }
      navigate(fieldRootPath(fieldId), { replace: true });
    } catch {
      setError(t("auth.changePasswordError"));
    }
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
      <form
        onSubmit={handleSubmit}
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: "14px",
          padding: "40px",
          width: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h2 style={{ color: COLORS.textWhite, textAlign: "center", marginBottom: "8px" }}>
          {t("auth.changePasswordTitle")}
        </h2>

        {error && (
          <div style={{ color: COLORS.error, fontSize: "13px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <input
          type="password"
          placeholder={t("auth.currentPasswordPlaceholder")}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          style={{
            padding: "10px 12px",
            background: COLORS.bgInput,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: "8px",
            color: COLORS.textPrimary,
            fontSize: "14px",
            outline: "none",
          }}
        />

        <input
          type="password"
          placeholder={t("auth.newPasswordPlaceholder")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{
            padding: "10px 12px",
            background: COLORS.bgInput,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: "8px",
            color: COLORS.textPrimary,
            fontSize: "14px",
            outline: "none",
          }}
        />

        <input
          type="password"
          placeholder={t("auth.confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{
            padding: "10px 12px",
            background: COLORS.bgInput,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: "8px",
            color: COLORS.textPrimary,
            fontSize: "14px",
            outline: "none",
          }}
        />

        <button
          type="submit"
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
          {t("auth.changePassword")}
        </button>
      </form>
    </div>
  );
};
