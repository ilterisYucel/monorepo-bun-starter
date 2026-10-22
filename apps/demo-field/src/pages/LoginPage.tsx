import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { postLoginDestination, siteFieldId } from "../lib/site-field";
import { COLORS_LIGHT, useTranslation } from "@gd-monorepo/ui";

/** Login ekranı — ışık tema (nova). */
export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const { login, mfaLogin, isAuthenticated, user, pendingMfaToken, mfaRequiredRoles } =
    useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (isAuthenticated && user) {
    const destination = postLoginDestination(user, mfaRequiredRoles, siteFieldId());
    if ("error" in destination) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: COLORS_LIGHT.bg,
          }}
        >
          <div style={{ color: "var(--nm-alarm)", fontSize: "14px" }}>
            {destination.error}
          </div>
        </div>
      );
    }
    navigate(destination.path, { replace: true });
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

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await mfaLogin(mfaCode);
    } catch {
      setError(t("auth.mfaWrongCode"));
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: COLORS_LIGHT.bg,
      }}
    >
      <form
        onSubmit={pendingMfaToken ? handleMfaSubmit : handleSubmit}
        style={{
          background: "var(--nm-panel)",
          border: `1px solid ${"var(--nm-line)"}`,
          borderRadius: "14px",
          padding: "40px",
          width: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h2 style={{ color: "var(--nm-fg)", textAlign: "center", marginBottom: "8px" }}>
          {pendingMfaToken ? t("auth.mfaTitle") : t("auth.loginTitle.field")}
        </h2>

        {error && (
          <div style={{ color: "var(--nm-alarm)", fontSize: "13px", textAlign: "center" }}>
            {error}
          </div>
        )}

        {pendingMfaToken ? (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t("auth.mfaCodePlaceholder")}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            style={{
              padding: "10px 12px",
              background: "var(--nm-panel2)",
              border: `1px solid ${"var(--nm-line)"}`,
              borderRadius: "8px",
              color: "var(--nm-fg)",
              fontSize: "14px",
              outline: "none",
              textAlign: "center",
              letterSpacing: "4px",
            }}
          />
        ) : (
          <>
            <input
              type="text"
              data-testid="login-username"
              placeholder={t("auth.usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                padding: "10px 12px",
                background: "var(--nm-panel2)",
                border: `1px solid ${"var(--nm-line)"}`,
                borderRadius: "8px",
                color: "var(--nm-fg)",
                fontSize: "14px",
                outline: "none",
              }}
            />

            <input
              type="password"
              data-testid="login-password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: "10px 12px",
                background: "var(--nm-panel2)",
                border: `1px solid ${"var(--nm-line)"}`,
                borderRadius: "8px",
                color: "var(--nm-fg)",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </>
        )}

        <button
          type="submit"
          data-testid="login-submit"
          style={{
            padding: "10px",
            background: "var(--nm-sel)",
            border: "none",
            borderRadius: "8px",
            color: "var(--nm-panel)",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {pendingMfaToken ? t("auth.mfaVerify") : t("auth.login")}
        </button>
      </form>
    </div>
  );
};
