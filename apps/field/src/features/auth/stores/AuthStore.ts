import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { apiClient } from "../../../lib/api-client";
import { isTunnelMode } from "../../../lib/api-base";
import type { Role, User } from "@gd-monorepo/shared-types";

/**
 * Varsayılan guest hesabı — otomatik misafir girişi (2026-08-30):
 * token yoksa veya çıkış yapıldıysa bu hesapla oturum açılır; manuel
 * misafir girişi yoktur. Seed kullanıcı backend'de SEED_GUEST_PASSWORD
 * env'iyle üretilir (bkz. web-service config/default.ts).
 */
const GUEST_USERNAME = "guest";
const GUEST_PASSWORD = "guest123";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeknik: boolean;
  isBoss: boolean;
  isGuest: boolean;
  isDeveloper: boolean;
  fieldIds: string[];
  /**
   * Faz 6 T6.1 + 2026-08-28 debug flag'i — sunucu config'inden gelen MFA
   * zorunlu roller. MFA_ENABLED=false ise boş gelir → guard'lar devre dışı.
   */
  mfaRequiredRoles: Role[];
  /** Faz 6 T6.1 — şifre adımı geçildi, kod bekleniyor. */
  pendingMfaToken: string | null;
  /**
   * Şifre adımı. Sunucu `mfaRequired` döndürürse token saklanır ve TRUE
   * döner (ikinci adım beklenir); normal girişte FALSE.
   */
  login: (username: string, password: string) => Promise<boolean>;
  /** Faz 6 T6.1 — TOTP/kurtarma kodu ile ikinci adım; başarıda oturum açılır. */
  mfaLogin: (code: string) => Promise<void>;
  /** Faz 6 T6.1 — kayıt başlat: sır + otpauth URI. */
  mfaEnroll: () => Promise<{ secret: string; otpauthUri: string }>;
  /** Faz 6 T6.1 — ilk kod doğrulaması: MFA aktifleşir, kurtarma kodları döner. */
  mfaConfirm: (code: string) => Promise<string[]>;
  /**
   * 2026-08-30: varsayılan guest hesabıyla giriş — uygulama açılışında token
   * yoksa ve logout sonrasında otomatik çağrılır.
   */
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  /** Faz 1 T1.6 — zorunlu şifre değişimi (yeni token'larla oturumu tazeler). */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  /**
   * Boss Faz 3 — tünel oturumu: cookie'den hydrate edilen kullanıcıyı uygular
   * (container-web session-auth deseni). localStorage'a YAZMAZ.
   */
  applySession: (user: User) => void;
}

/**
 * Boss Faz 3 — token kalıcılığı tünel modunda NO-OP'tur:
 * iframe boss origin'inde çalışır; boss uygulamasının localStorage anahtarları
 * ("auth-token") ÇAKIŞIR — field oturum verisi boss'un üzerine yazamaz.
 * Kimlik doğruluğu tünelde `field_session` cookie'sindedir (HttpOnly).
 */
function persistTokens(accessToken: string, refreshToken: string): void {
  if (isTunnelMode()) return;
  localStorage.setItem("auth-token", accessToken);
  localStorage.setItem("auth-refresh-token", refreshToken);
}

function applySession(
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
    mfaRequiredRoles?: Role[];
  },
  set: (state: Partial<AuthState>) => void,
) {
  persistTokens(data.accessToken, data.refreshToken);
  set({
    user: data.user,
    isAuthenticated: true,
    isAdmin: data.user.role === "admin",
    isTeknik: data.user.role === "teknik",
    isBoss: data.user.role === "boss",
    isGuest: data.user.role === "guest",
    isDeveloper: data.user.role === "developer",
    fieldIds: data.user.fieldIds ?? [],
    mfaRequiredRoles: data.mfaRequiredRoles ?? [],
    pendingMfaToken: null,
  });
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isTeknik: false,
      isBoss: false,
      isGuest: false,
      isDeveloper: false,
      fieldIds: [],
      mfaRequiredRoles: [],
      pendingMfaToken: null,

      login: async (username: string, password: string) => {
        const res = await apiClient.post("/auth/login", { username, password });
        const data = res.data;
        if (data.mfaRequired) {
          // Faz 6 T6.1: ikinci adım — oturum henüz açılmadı.
          set({ pendingMfaToken: data.mfaToken, user: data.user });
          return true;
        }
        applySession(data, set);
        return false;
      },

      mfaLogin: async (code: string) => {
        const token = get().pendingMfaToken;
        if (!token) throw new Error("MFA adimi beklenmiyor");
        const res = await apiClient.post("/auth/login/mfa", {
          mfaToken: token,
          code,
        });
        applySession(res.data, set);
      },

      mfaEnroll: async () => {
        const res = await apiClient.post("/auth/mfa/enroll");
        return res.data as { secret: string; otpauthUri: string };
      },

      mfaConfirm: async (code: string) => {
        const res = await apiClient.post("/auth/mfa/confirm", { code });
        const data = res.data as {
          recoveryCodes: string[];
          user: User;
          accessToken: string;
          refreshToken: string;
        };
        applySession(data, set);
        return data.recoveryCodes;
      },

      loginAsGuest: async () => {
        try {
          const res = await apiClient.post("/auth/login", {
            username: GUEST_USERNAME,
            password: GUEST_PASSWORD,
          });
          applySession(res.data, set);
        } catch {
          // backend yok — unauthenticated kal (kademeli bozulma)
        }
      },

      logout: async () => {
        try {
          await apiClient.post("/auth/logout");
        } catch {
          // sunucu hatasi olsa bile temizle
        }
        if (!isTunnelMode()) {
          localStorage.removeItem("auth-token");
          localStorage.removeItem("auth-refresh-token");
        }
        set({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          isTeknik: false,
          isBoss: false,
          isGuest: false,
          isDeveloper: false,
          fieldIds: [],
          mfaRequiredRoles: [],
          pendingMfaToken: null,
        });

        // 2026-08-30: çıkışta OTOMATİK guest girişi — API çağrıları çalışmaya
        // devam eder, kullanıcı dashboard'da kalır (manuel guest yok).
        // Boss Faz 3 istisnası: tünel modunda guest'e düşmek YOKTUR — oturum
        // cookie'si tek doğruluk kaynağıdır; hydrate başarısızsa guard ekranı.
        if (!isTunnelMode()) {
          await get().loginAsGuest();
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        const res = await apiClient.post("/auth/change-password", {
          oldPassword,
          newPassword,
        });
        applySession(res.data, set);
      },

      // Boss Faz 3 — tünel hydrate'i (container-web applySession deseni):
      // cookie doğruluk kaynağıdır; localStorage'a YAZILMAZ.
      applySession: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isAdmin: user.role === "admin",
          isTeknik: user.role === "teknik",
          isBoss: user.role === "boss",
          isGuest: user.role === "guest",
          isDeveloper: user.role === "developer",
          fieldIds: user.fieldIds ?? [],
          mfaRequiredRoles: [],
          pendingMfaToken: null,
        });
      },
    }),
    {
      name: "field-auth-storage",
      // Boss Faz 3 — tünel modunda persist no-op (localStorage izolasyonu).
      storage: createJSONStorage(() =>
        isTunnelMode()
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
    },
  ),
);
