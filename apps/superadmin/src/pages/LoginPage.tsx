import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { COLORS, useTranslation } from "@gd-monorepo/ui";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (isAuthenticated) {
    // Faz 1 T1.6: seed kullanıcıları ilk girişte şifre değiştirmek zorunda
    if (user?.mustChangePassword) {
      navigate("/change-password", { replace: true });
      return null;
    }
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
    } catch {
      setError(t("auth.loginError"));
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
        padding: "16px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: "16px",
          padding: "32px 24px",
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h2 style={{ color: COLORS.textWhite, textAlign: "center", fontSize: "18px" }}>
          {t("auth.loginTitle.boss")}
        </h2>

        {error && (
          <div style={{ color: COLORS.error, fontSize: "13px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder={t("auth.usernamePlaceholder")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          style={{
            padding: "12px 14px",
            background: COLORS.bgInput,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: "10px",
            color: COLORS.textPrimary,
            fontSize: "15px",
            outline: "none",
            WebkitAppearance: "none",
          }}
        />

        <input
          type="password"
          placeholder={t("auth.passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{
            padding: "12px 14px",
            background: COLORS.bgInput,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: "10px",
            color: COLORS.textPrimary,
            fontSize: "15px",
            outline: "none",
            WebkitAppearance: "none",
          }}
        />

        <button
          type="submit"
          style={{
            padding: "12px",
            background: COLORS.info,
            border: "none",
            borderRadius: "10px",
            color: COLORS.textWhite,
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
            marginTop: "4px",
          }}
        >
          {t("auth.login")}
        </button>
      </form>
    </div>
  );
};
