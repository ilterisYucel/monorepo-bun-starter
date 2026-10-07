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
          <div style={{ color: COLORS_LIGHT.alarm, fontSize: "14px" }}>
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
          background: COLORS_LIGHT.panel,
          border: `1px solid ${COLORS_LIGHT.line}`,
          borderRadius: "14px",
          padding: "40px",
          width: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h2 style={{ color: COLORS_LIGHT.fg, textAlign: "center", marginBottom: "8px" }}>
          {pendingMfaToken ? t("auth.mfaTitle") : t("auth.loginTitle.field")}
        </h2>

        {error && (
          <div style={{ color: COLORS_LIGHT.alarm, fontSize: "13px", textAlign: "center" }}>
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
              background: COLORS_LIGHT.panel2,
              border: `1px solid ${COLORS_LIGHT.line}`,
              borderRadius: "8px",
              color: COLORS_LIGHT.fg,
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
              placeholder={t("auth.usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                padding: "10px 12px",
                background: COLORS_LIGHT.panel2,
                border: `1px solid ${COLORS_LIGHT.line}`,
                borderRadius: "8px",
                color: COLORS_LIGHT.fg,
                fontSize: "14px",
                outline: "none",
              }}
            />

            <input
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: "10px 12px",
                background: COLORS_LIGHT.panel2,
                border: `1px solid ${COLORS_LIGHT.line}`,
                borderRadius: "8px",
                color: COLORS_LIGHT.fg,
                fontSize: "14px",
                outline: "none",
              }}
            />
          </>
        )}

        <button
          type="submit"
          style={{
            padding: "10px",
            background: COLORS_LIGHT.sel,
            border: "none",
            borderRadius: "8px",
            color: COLORS_LIGHT.panel,
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
