import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "@gd-monorepo/ui";
import { useAuthStore } from "../features/auth/stores/AuthStore";
import { postLoginDestination, siteFieldId } from "../lib/site-field";
import "./ChangePasswordPage.css";

/** Sunucu politikasıyla hizalı istemci ön doğrulaması (sunucu tek yetkilidir). */
const MIN_PASSWORD_LENGTH = 8;

/**
 * ChangePasswordPage — zorunlu şifre değişimi ekranı (SITE-MIMARISI UC-4, K6).
 *
 * Backend rbac `mustChangePassword=true` iken şifre değişimi dışındaki tüm yolları
 * 403 ile kapatır; bu sayfa değişim tamamlanana kadar tek çıkıştır.
 *
 * Durumlar:
 * - Oturum yok → `/login`'e `replace` ile yönlendirir (FR-4.6).
 * - Form: mevcut şifre, yeni şifre, yeni şifre tekrarı + gönder butonu.
 *
 * Gönderim (FR-4.3..FR-4.5):
 * - Yeni şifre < 8 karakter → `auth.newPasswordMin` hatası; istek ATILMAZ.
 * - Yeni şifre ≠ tekrar → `auth.passwordMismatch` hatası; istek ATILMAZ.
 *   (İstemci kontrolü yalnız ön doğrulamadır; politika sahibi sunucudur — min 8 / max 100.)
 * - Geçerli → `AuthStore.changePassword(eski, yeni)` bir kez çağrılır.
 *   - Başarı: oturum yeni token çiftiyle tazelenmiş olur (AUTH K6);
 *     `postLoginDestination(user, [], siteFieldId())` hedefine `replace` ile gidilir.
 *     Hedef `{ error }` ise hata mesajı gösterilir, navigasyon olmaz.
 *   - Hata (yanlış mevcut şifre, politika reddi, ağ): `auth.changePasswordError`
 *     gösterilir, sayfada kalınır (beklenen hata — fırlatılmaz).
 *
 * Görünüm: `LoginPage` nova stili (`--nm-*` değişkenleri; `ChangePasswordPage.css`).
 * Tünel modunda bu sayfaya guard yönlendirmez (AUTH K9).
 */
export const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { changePassword, user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("auth.newPasswordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    try {
      await changePassword(oldPassword, newPassword);
    } catch {
      setError(t("auth.changePasswordError"));
      return;
    }
    // Sunucu başarıyla döndüyse zorunluluk kalkmıştır (yeni token mustChangePassword=false taşır).
    const destination = postLoginDestination(
      { ...user, mustChangePassword: false },
      [],
      siteFieldId(),
    );
    if ("error" in destination) {
      setError(destination.error);
      return;
    }
    navigate(destination.path, { replace: true });
  };

  return (
    <div className="change-password">
      <form className="change-password__form" onSubmit={handleSubmit}>
        <h2 className="change-password__title">{t("auth.changePasswordTitle")}</h2>

        {error && (
          <div role="alert" data-testid="change-password-error" className="change-password__error">
            {error}
          </div>
        )}

        <input
          className="change-password__input"
          type="password"
          autoComplete="current-password"
          placeholder={t("auth.currentPasswordPlaceholder")}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          className="change-password__input"
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.newPasswordPlaceholder")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          className="change-password__input"
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit" className="change-password__submit">
          {t("auth.changePassword")}
        </button>
      </form>
    </div>
  );
};
