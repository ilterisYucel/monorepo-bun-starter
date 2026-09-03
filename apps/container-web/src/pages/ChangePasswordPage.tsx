import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@gd-monorepo/ui";
import { useAuth } from "../features/auth/hooks/useAuth";
import * as S from "../features/auth/components/LoginForm.styles";

/**
 * ChangePasswordPage — Faz 1 T1.6: ilk girişte zorunlu şifre değişimi.
 */
export const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { changePassword } = useAuth();
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
    setIsLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t("auth.changePasswordError");
      setError(message);
    }
    setIsLoading(false);
  };

  return (
    <S.LoginContainer>
      <S.LoginCard>
        <S.LoginHeader>
          <h1>EMS</h1>
          <p>{t("auth.changePasswordTitle")}</p>
        </S.LoginHeader>
        <S.LoginFormElement onSubmit={handleSubmit}>
          <S.FormGroup>
            <label>{t("auth.currentPasswordPlaceholder")}</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </S.FormGroup>
          <S.FormGroup>
            <label>{t("auth.newPasswordPlaceholder")}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </S.FormGroup>
          <S.FormGroup>
            <label>{t("auth.confirmPasswordPlaceholder")}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </S.FormGroup>
          {error && <S.ErrorMessage>{error}</S.ErrorMessage>}
          <S.LoginBtn type="submit" disabled={isLoading}>
            {isLoading ? t("auth.loggingIn") : t("auth.changePassword")}
          </S.LoginBtn>
        </S.LoginFormElement>
      </S.LoginCard>
    </S.LoginContainer>
  );
};
