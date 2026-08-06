import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { COLORS } from "@gd-monorepo/ui";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  if (isAuthenticated && user) {
    if (user.role === "boss") {
      window.location.href = "/map";
      return null;
    }
    const firstFieldId = user.fieldIds?.[0] ?? "default-field";
    navigate(`/field/${firstFieldId}`, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
    } catch {
      setError("Gecersiz kullanici adi veya sifre");
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
          Saha Girisi
        </h2>

        {error && (
          <div style={{ color: COLORS.error, fontSize: "13px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Kullanici adi"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
          placeholder="Sifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          Giris Yap
        </button>
      </form>
    </div>
  );
};
