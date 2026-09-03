import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { COLORS, useTranslation } from "@gd-monorepo/ui";

/**
 * ChangePasswordPage — Faz 1 T1.6: ilk girişte zorunlu şifre değişimi.
 */
export const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { changePassword } = useAuthStore();
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
      navigate("/dashboard", { replace: true });
    } catch {
      setError(t("auth.changePasswordError"));
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    background: COLORS.bgInput,
    border: `1px solid ${COLORS.borderDefault}`,
    borderRadius: "8px",
    color: COLORS.textPrimary,
    fontSize: "14px",
    outline: "none",
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
          style={inputStyle}
        />
        <input
          type="password"
          placeholder={t("auth.newPasswordPlaceholder")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder={t("auth.confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
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
